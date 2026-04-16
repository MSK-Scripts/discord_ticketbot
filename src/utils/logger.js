const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function timestamp() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

function format(level, color, ...args) {
  const ts = `${COLORS.gray}[${timestamp()}]${COLORS.reset}`;
  const tag = `${color}${COLORS.bright}[${level}]${COLORS.reset}`;
  console.log(ts, tag, ...args);
}

const logger = {
  info:  (...args) => format('INFO ', COLORS.cyan,   ...args),
  warn:  (...args) => format('WARN ', COLORS.yellow, ...args),
  error: (...args) => format('ERROR', COLORS.red,    ...args),
  success: (...args) => format('OK   ', COLORS.green, ...args),
  debug: (...args) => {
    if (process.env.DEBUG) format('DEBUG', COLORS.gray, ...args);
  },
};

module.exports = logger;
