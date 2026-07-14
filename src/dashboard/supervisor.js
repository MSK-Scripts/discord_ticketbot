/**
 * Bot process supervisor.
 *
 * The dashboard MUST NOT live inside the bot process: a dashboard served by the
 * very process it is supposed to restart cannot restart it (and is gone exactly
 * when you need it — after a crash). So the supervisor is the parent, and the
 * bot is a child process it can start, stop, restart and update.
 *
 * The bot's own entry point (index.js) stays untouched and still works standalone.
 */

const { fork } = require('child_process');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

const BOT_ENTRY = path.resolve(__dirname, '../../index.js');
const ROOT      = path.resolve(__dirname, '../..');
const ENV_PATH  = path.join(ROOT, '.env');

const MAX_LOG_LINES = 500;

// Crash-restart policy, mirroring the systemd unit (on-failure, a few attempts
// in a short window, then give up and stay down instead of crash-looping).
const RESTART_DELAY_MS   = 5_000;
const MAX_RESTARTS       = 5;
const RESTART_WINDOW_MS  = 120_000;

class BotSupervisor extends EventEmitter {
  /**
   * @param {object}  [options]
   * @param {boolean} [options.mirrorToConsole=true]
   *   Also write the bot's output to our own stdout. The bot is spawned with
   *   silent:true so we can capture its output for the dashboard console — but
   *   capturing it must not mean HIDING it. Without this, `npm run dashboard`
   *   would show a silent terminal and the operator could not tell whether the
   *   bot came up or crashed on boot.
   */
  constructor({ mirrorToConsole = true } = {}) {
    super();
    this.mirrorToConsole = mirrorToConsole;
    this.child = null;
    /** 'stopped' | 'starting' | 'running' | 'stopping' | 'crashed' */
    this.status = 'stopped';
    this.logs = [];
    this.startedAt = null;
    this.intentionalStop = false;
    this.restartTimes = [];
    this.restartTimer = null;
    this.busy = false;
  }

  // ── Logs ───────────────────────────────────────────────────────────────────

  pushLog(line) {
    for (const part of String(line).split('\n')) {
      if (part.length === 0) continue;

      // Mirror to our own stdout so the terminal behaves like a normal bot start.
      // ANSI colours pass through untouched.
      if (this.mirrorToConsole) process.stdout.write(`${part}\n`);

      this.logs.push(part);
      if (this.logs.length > MAX_LOG_LINES) this.logs.shift();
      this.emit('log', part);
    }
  }

  getLogs() {
    return [...this.logs];
  }

  setStatus(next) {
    if (this.status === next) return;
    this.status = next;
    this.emit('status', next);
  }

  getState() {
    return {
      status: this.status,
      pid: this.child?.pid ?? null,
      startedAt: this.startedAt,
      uptimeMs: this.startedAt ? Date.now() - this.startedAt : 0,
    };
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  start() {
    if (this.child) return { ok: false, error: 'The bot is already running.' };

    this.setStatus('starting');
    this.intentionalStop = false;
    this.cancelScheduledRestart();

    // Re-read .env from disk before every (re)start. The dashboard can edit .env,
    // and a plain fork({ env: process.env }) would hand the bot the values loaded
    // ONCE at dashboard boot — so a rotated TOKEN or DATABASE_URL would silently
    // not take effect even after a restart. dotenv.parse does not touch the
    // running env; we merge the file over process.env so the file wins for the
    // keys it defines (that is the whole point of editing it).
    let childEnv = process.env;
    try {
      const fileEnv = require('dotenv').parse(fs.readFileSync(ENV_PATH));
      Object.assign(process.env, fileEnv); // so the dashboard's own REST client updates too
      childEnv = { ...process.env, ...fileEnv };
    } catch { /* no .env file (env passed some other way) — inherit as-is */ }

    // silent: true pipes the child's stdout/stderr to us instead of inheriting,
    // which is what lets the dashboard stream live logs.
    const child = fork(BOT_ENTRY, [], {
      cwd: ROOT,
      silent: true,
      env: childEnv,
    });

    this.child = child;
    this.startedAt = Date.now();

    child.stdout?.on('data', (d) => this.pushLog(d.toString()));
    child.stderr?.on('data', (d) => this.pushLog(d.toString()));

    child.on('spawn', () => {
      this.setStatus('running');
      this.pushLog('==> [supervisor] bot process started');
    });

    child.on('error', (err) => {
      this.pushLog(`==> [supervisor] failed to spawn bot: ${err.message}`);
      this.child = null;
      this.setStatus('crashed');
    });

    child.on('exit', (code, signal) => {
      this.child = null;
      this.startedAt = null;
      this.pushLog(`==> [supervisor] bot exited (code=${code} signal=${signal ?? 'none'})`);

      if (this.intentionalStop) {
        this.setStatus('stopped');
        return;
      }
      this.setStatus('crashed');
      this.scheduleRestart();
    });

    return { ok: true };
  }

  /**
   * Restart after an unexpected exit, but only a few times inside a short window.
   * A bot that crashes on boot (bad config, bad token) must NOT be restarted
   * forever — that just buries the real error in a crash loop.
   */
  scheduleRestart() {
    const now = Date.now();
    this.restartTimes = this.restartTimes.filter(t => now - t < RESTART_WINDOW_MS);

    if (this.restartTimes.length >= MAX_RESTARTS) {
      this.pushLog(
        `==> [supervisor] bot crashed ${MAX_RESTARTS} times within ` +
        `${RESTART_WINDOW_MS / 1000}s — not restarting again. Fix the error above and start it manually.`,
      );
      return;
    }

    this.restartTimes.push(now);
    this.pushLog(`==> [supervisor] restarting in ${RESTART_DELAY_MS / 1000}s …`);
    this.restartTimer = setTimeout(() => {
      this.restartTimer = null;
      if (!this.child) this.start();
    }, RESTART_DELAY_MS);
    if (typeof this.restartTimer.unref === 'function') this.restartTimer.unref();
  }

  /** Cancel a pending crash-restart. Without this, a Stop issued during the 5s
   *  restart window is ignored and the bot comes back up against the operator's
   *  intent. */
  cancelScheduledRestart() {
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
  }

  async stop({ timeoutMs = 10_000 } = {}) {
    // A crash may have left the child null but a restart pending — cancel it, so
    // "Stop" always means stopped even when clicked mid-restart-window.
    this.cancelScheduledRestart();
    if (!this.child) {
      this.intentionalStop = true;
      this.setStatus('stopped');
      return { ok: false, error: 'The bot is not running.' };
    }

    this.intentionalStop = true;
    this.setStatus('stopping');
    const child = this.child;

    return new Promise((resolve) => {
      // Escalate to SIGKILL if the bot ignores SIGTERM.
      const kill = setTimeout(() => {
        if (child && !child.killed) {
          this.pushLog('==> [supervisor] bot did not exit in time — sending SIGKILL');
          child.kill('SIGKILL');
        }
      }, timeoutMs);
      if (typeof kill.unref === 'function') kill.unref();

      child.once('exit', () => {
        clearTimeout(kill);
        resolve({ ok: true });
      });

      child.kill('SIGTERM');
    });
  }

  async restart() {
    if (this.child) await this.stop();
    this.restartTimes = []; // an operator-requested restart is not a crash
    return this.start();
  }

  /**
   * git pull + npm install, then restart the bot.
   * Runs in the repo root; output is streamed into the log ring buffer so the
   * operator can see what happened in the dashboard console.
   */
  async update() {
    if (this.busy) return { ok: false, error: 'Another operation is already running.' };
    this.busy = true;

    try {
      this.pushLog('==> [supervisor] git pull');
      const pull = await this.run('git', ['pull']);
      if (!pull.ok) return { ok: false, error: 'git pull failed', detail: pull.output };

      this.pushLog('==> [supervisor] npm install --omit=dev');
      const install = await this.run('npm', ['install', '--omit=dev']);
      if (!install.ok) return { ok: false, error: 'npm install failed', detail: install.output };

      this.pushLog('==> [supervisor] restarting bot with the new version');
      await this.restart();

      return { ok: true, output: `${pull.output}\n${install.output}`.trim() };
    } finally {
      this.busy = false;
    }
  }

  // ── IPC to the bot ─────────────────────────────────────────────────────────
  //
  // Ticket actions (claim, close, reply, …) cannot be done by the dashboard on
  // its own: closing a ticket is not a DB update, it runs the whole performClose
  // flow (channel permissions, transcript, DM, rating, category move) and needs
  // the live discord.js client. That client lives in the bot child, so the
  // dashboard sends it a command over the IPC channel that fork() gives us and
  // waits for the reply.

  /**
   * Send a command to the bot and await its result.
   *
   * The default timeout is deliberately generous. Closing a ticket is not a quick
   * DB write: it renders the full transcript (fetching every message and inlining
   * avatars as base64), uploads it, rewrites channel permissions, DMs the user and
   * moves the channel. On a busy ticket that easily takes longer than a naive few
   * seconds — and timing out early would report a FAILURE for an action that then
   * completes anyway, which is worse than no error at all.
   *
   * @returns {Promise<{ok: boolean, data?: any, error?: string}>}
   */
  command(action, payload = {}, { timeoutMs = 90_000 } = {}) {
    return new Promise((resolve) => {
      if (!this.child || this.status !== 'running') {
        resolve({ ok: false, error: 'The bot is not running — start it to perform this action.' });
        return;
      }

      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const child = this.child;

      const cleanup = () => {
        clearTimeout(timer);
        child.off('message', onMessage);
        child.off('exit', onExit);
      };

      const timer = setTimeout(() => {
        cleanup();
        // Do NOT claim it failed: the bot may well still be working and finish.
        resolve({
          ok: false,
          error: 'The bot is taking longer than expected. The action may still complete — reload in a moment.',
        });
      }, timeoutMs);

      const onMessage = (msg) => {
        if (!msg || msg.__tb !== 'reply' || msg.id !== id) return;
        cleanup();
        resolve(msg.result ?? { ok: false, error: 'Empty reply from the bot.' });
      };

      // If the bot dies mid-action, fail fast instead of hanging for the full
      // timeout: the reply is never coming.
      const onExit = () => {
        cleanup();
        resolve({ ok: false, error: 'The bot stopped before the action completed.' });
      };

      child.on('message', onMessage);
      child.once('exit', onExit);
      child.send({ __tb: 'command', id, action, payload }, (err) => {
        if (err) {
          cleanup();
          resolve({ ok: false, error: `Could not reach the bot: ${err.message}` });
        }
      });
    });
  }

  /** Run a command in the repo root, capturing its output into the log buffer. */
  run(cmd, args) {
    return new Promise((resolve) => {
      // shell: true so `npm` resolves to npm.cmd on Windows.
      const proc = spawn(cmd, args, { cwd: ROOT, shell: true });
      let output = '';

      const collect = (d) => {
        const text = d.toString();
        output += text;
        this.pushLog(text);
      };
      proc.stdout?.on('data', collect);
      proc.stderr?.on('data', collect);

      proc.on('error', (err) => resolve({ ok: false, output: `${output}\n${err.message}` }));
      proc.on('close', (code) => resolve({ ok: code === 0, output: output.trim() }));
    });
  }
}

module.exports = { BotSupervisor };
