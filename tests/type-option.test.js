/**
 * The dashboard creates ticket types with description '', and Discord rejects
 * an empty option description. typeOption must leave it out instead of
 * breaking every type picker.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { StringSelectMenuBuilder } = require('discord.js');
const { typeOption } = require('../src/utils/typeOption');

const base = { name: 'Support', codeName: 'support', emoji: '🎫' };

for (const description of ['', '   ', undefined, null]) {
  test(`a type with description ${JSON.stringify(description)} builds a valid menu`, () => {
    const option = typeOption({ ...base, description });
    assert.equal(option.data.description, undefined);
    const menu = new StringSelectMenuBuilder().setCustomId('x').addOptions(option);
    assert.doesNotThrow(() => menu.toJSON());
  });
}

test('a description is kept and cut to 100 characters', () => {
  assert.equal(typeOption({ ...base, description: 'Help with scripts' }).data.description, 'Help with scripts');
  assert.equal(typeOption({ ...base, description: 'x'.repeat(150) }).data.description.length, 100);
});

test('label, value and the fallback emoji are set', () => {
  const data = typeOption({ name: 'Order', codeName: 'order' }).data;
  assert.equal(data.label, 'Order');
  assert.equal(data.value, 'order');
  assert.equal(data.emoji.name, '🎫');
});
