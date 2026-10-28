/**
 * Focus handling of the native dialog, drawer and popover (web/src/lib/layers.js).
 *
 * A keyboard or screen reader user who closes a dialog must land back on the
 * button that opened it, not at the top of the page (WCAG 2.4.3). The browser
 * usually does this itself; the helper covers the cases where it does not, and
 * must never steal focus from where the person has already moved it. These
 * tests run the helper against small DOM fakes.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const layers = () => import(pathToFileURL(path.join(__dirname, '../web/src/lib/layers.js')).href);

/** A minimal document with focusable elements and containment. */
function fakeDocument() {
  const doc = { activeElement: null };
  doc.body = makeEl(doc, 'body');
  doc.activeElement = doc.body;
  return doc;
}

function makeEl(doc, name, parent = null) {
  const el = {
    name,
    parent,
    isConnected: true,
    focus() { doc.activeElement = el; },
    contains(other) {
      for (let n = other; n; n = n.parent) if (n === el) return true;
      return false;
    },
  };
  return el;
}

/** A fake <dialog>: showModal() moves focus to its first field, close() to <body>. */
function fakeDialog(doc) {
  const dialog = makeEl(doc, 'dialog');
  const field = makeEl(doc, 'field', dialog);
  dialog.open = false;
  dialog.showModal = () => { dialog.open = true; field.focus(); };
  dialog.close = () => { dialog.open = false; doc.activeElement = doc.body; };
  return { dialog, field };
}

test('closing a dialog hands focus back to the button that opened it', async () => {
  const { syncModal, handBackFocus } = await layers();
  const doc = fakeDocument();
  const opener = makeEl(doc, 'close-ticket-button');
  const { dialog, field } = fakeDialog(doc);

  opener.focus();
  syncModal(dialog, true, doc);
  assert.equal(dialog.open, true);
  assert.equal(doc.activeElement, field, 'focus moves into the dialog');

  dialog.close(); // Escape, the cancel button or the backdrop
  const got = handBackFocus(dialog, doc);
  assert.equal(got, opener);
  assert.equal(doc.activeElement, opener);
});

test('closing from code (state set to closed) also hands focus back', async () => {
  const { syncModal, handBackFocus } = await layers();
  const doc = fakeDocument();
  const opener = makeEl(doc, 'menu-button');
  const { dialog } = fakeDialog(doc);

  opener.focus();
  syncModal(dialog, true, doc);
  syncModal(dialog, false, doc);
  assert.equal(dialog.open, false);
  handBackFocus(dialog, doc);
  assert.equal(doc.activeElement, opener);
});

test('focus still inside the closed layer counts as lost and is handed back', async () => {
  const { rememberFocus, handBackFocus } = await layers();
  const doc = fakeDocument();
  const button = makeEl(doc, 'theme-button');
  const panel = makeEl(doc, 'panel');
  const choice = makeEl(doc, 'dark-choice', panel);

  rememberFocus(panel, doc, button);
  choice.focus(); // the person picked an option, then the panel hid
  handBackFocus(panel, doc);
  assert.equal(doc.activeElement, button);
});

test('focus the person already moved elsewhere is left alone', async () => {
  const { syncModal, handBackFocus } = await layers();
  const doc = fakeDocument();
  const opener = makeEl(doc, 'opener');
  const elsewhere = makeEl(doc, 'search-field');
  const { dialog } = fakeDialog(doc);

  opener.focus();
  syncModal(dialog, true, doc);
  dialog.close();
  elsewhere.focus(); // e.g. a click on another field closed a popover
  assert.equal(handBackFocus(dialog, doc), null);
  assert.equal(doc.activeElement, elsewhere);
});

test('an opener that was re-rendered away falls back instead of failing', async () => {
  const { syncModal, handBackFocus } = await layers();
  const doc = fakeDocument();
  const opener = makeEl(doc, 'opener');
  const fallback = makeEl(doc, 'main');
  const { dialog } = fakeDialog(doc);

  opener.focus();
  syncModal(dialog, true, doc);
  opener.isConnected = false;
  dialog.close();
  assert.equal(handBackFocus(dialog, doc, fallback), fallback);
  assert.equal(doc.activeElement, fallback);
});

test('the opener is forgotten after the hand-back', async () => {
  const { syncModal, handBackFocus } = await layers();
  const doc = fakeDocument();
  const opener = makeEl(doc, 'opener');
  const { dialog } = fakeDialog(doc);

  opener.focus();
  syncModal(dialog, true, doc);
  dialog.close();
  handBackFocus(dialog, doc);
  doc.activeElement = doc.body;
  assert.equal(handBackFocus(dialog, doc), null, 'a second close must not jump to a stale opener');
});

test('syncModal never calls showModal twice (React StrictMode runs effects twice)', async () => {
  const { syncModal } = await layers();
  const doc = fakeDocument();
  const { dialog } = fakeDialog(doc);
  let calls = 0;
  const show = dialog.showModal;
  dialog.showModal = () => { calls++; show(); };
  syncModal(dialog, true, doc);
  syncModal(dialog, true, doc);
  assert.equal(calls, 1);
});

test('a popover panel is placed below its button and kept inside the window', async () => {
  const { placePanel } = await layers();
  const win = { innerWidth: 375, innerHeight: 700 };
  const panel = { offsetWidth: 320, offsetHeight: 200, style: {} };
  placePanel(panel, { left: 300, right: 344, top: 10, bottom: 54 }, { align: 'end', win });
  assert.equal(panel.style.top, '60px');
  assert.equal(panel.style.left, '24px');

  // No room below: it opens above the button instead.
  const low = { offsetWidth: 200, offsetHeight: 300, style: {} };
  placePanel(low, { left: 20, right: 64, top: 600, bottom: 644 }, { align: 'start', win });
  assert.equal(low.style.top, '294px');
  assert.equal(low.style.left, '20px');
});
