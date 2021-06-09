'use strict';

const tap = require('tap');
const partitionMessages = require('./partition-messages');

tap.test('partitions messages based on attributes', async t => {
  const messages = [
    { Attributes: { MessageGroupId: 'one' }, Body: 'foo' },
    { Body: 'non-fifo' },
    { Attributes: { MessageGroupId: 'one' }, Body: 'bar' },
    { Attributes: { MessageGroupId: 'two' }, Body: 'foo' }
  ];
  const partitioned = partitionMessages({ messages });

  t.strictSame(partitioned, {
    default: [{ Body: 'non-fifo' }],
    one: [
      { Attributes: { MessageGroupId: 'one' }, Body: 'foo' },
      { Attributes: { MessageGroupId: 'one' }, Body: 'bar' }
    ],
    two: [{ Attributes: { MessageGroupId: 'two' }, Body: 'foo' }]
  });
});
