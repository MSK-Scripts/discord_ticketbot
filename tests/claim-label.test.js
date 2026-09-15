'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { updateChannelTopic, refreshTicketMessage } = require('../src/utils/ticketActions');
const pl = require('../locales/pl.json');

function makeClient(locale) {
  return {
    locale,
    config: { closeOption: { closeButton: true }, claimOption: { claimButton: true }, ticketTypes: [] },
    user: { id: 'bot' },
    t: (key) => key.split('.').reduce((o, k) => (o ? o[k] : undefined), locale) ?? key,
    logger: { warn() {}, info() {}, error() {} },
  };
}

function makeChannel(fields) {
  const state = { topic: null, edited: null };
  const message = {
    author: { id: 'bot' },
    embeds: [{ title: 'Ticket', description: '**Priorytet:** 🟡', fields }],
    components: [{ components: [{ customId: 'tb_claim' }] }],
    edit: async (payload) => { state.edited = payload; },
  };
  return {
    state,
    setTopic: async (topic) => { state.topic = topic; },
    messages: { fetch: async () => [message] },
  };
}

test('channel topic uses the translated claim label', async () => {
  const channel = makeChannel([]);
  await updateChannelTopic(channel, { priority: 'medium' }, { claimedBy: '123' }, makeClient(pl));
  assert.match(channel.state.topic, /🙋 Przejęte przez <@123>/);
  assert.doesNotMatch(channel.state.topic, /Claimed by/);
});

test('claiming adds a translated field to the opening message', async () => {
  const channel = makeChannel([]);
  await refreshTicketMessage(channel, true, { priority: 'medium' }, { claimedBy: '123' }, makeClient(pl));
  const fields = channel.state.edited.embeds[0].toJSON().fields;
  assert.deepEqual(fields.map(f => f.name), ['🙋 Przejęte przez']);
});

test('refresh replaces a legacy English field instead of duplicating it', async () => {
  const channel = makeChannel([{ name: '🙋 Claimed by', value: '<@1>', inline: true }]);
  await refreshTicketMessage(channel, true, { priority: 'medium' }, { claimedBy: '123' }, makeClient(pl));
  const fields = channel.state.edited.embeds[0].toJSON().fields;
  assert.deepEqual(fields, [{ name: '🙋 Przejęte przez', value: '<@123>', inline: true }]);
});

test('unclaiming removes the translated field', async () => {
  const channel = makeChannel([{ name: '🙋 Przejęte przez', value: '<@123>', inline: true }]);
  await refreshTicketMessage(channel, false, { priority: 'medium' }, { claimedBy: null }, makeClient(pl));
  assert.deepEqual(channel.state.edited.embeds[0].toJSON().fields ?? [], []);
});
