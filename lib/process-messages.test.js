'use strict';

const tap = require('tap');
const symbols = require('./symbols');
const processMessages = require('./process-messages');

tap.test('throws if cannot parition messages', async t => {
  function partitionMessages() {
    throw Error('broken partition');
  }
  try {
    await processMessages({ messages: ['foo'], partitionMessages });
    t.fail('should not be invoked');
  } catch (error) {
    t.match(error, /broken partition/);
  }
});

tap.test('throws if cannot handle messages', async t => {
  function partitionMessages({ messages }) {
    t.strictSame(messages, ['foo']);
    return { default: ['foo'] };
  }

  async function handleMessage() {
    throw Error('cannot handle message');
  }

  try {
    await processMessages({ messages: ['foo'], partitionMessages, handleMessage });
    t.fail('should not be invoked');
  } catch (error) {
    t.match(error, /cannot handle message/);
  }
});

tap.test('throws if cannot handle fifo messages', async t => {
  const app = {
    [symbols.symFifoSorter]: () => {}
  };

  function partitionMessages({ messages }) {
    t.strictSame(messages, ['foo']);
    return { default: [], fifo: ['foo'] };
  }

  async function handleMessage() {
    t.fail('should not be invoked');
  }

  async function groupHandler() {
    throw Error('cannot handle fifo message');
  }

  try {
    await processMessages({
      messages: ['foo'],
      app,
      partitionMessages,
      handleMessage,
      groupHandler
    });
    t.fail('should not be invoked');
  } catch (error) {
    t.match(error, /cannot handle fifo message/);
  }
});

tap.test('does not throw on all success', async t => {
  const app = {
    [symbols.symFifoSorter]: () => {}
  };

  function partitionMessages({ messages }) {
    t.strictSame(messages, ['foo']);
    return { default: ['foo'], fifo: ['bar'] };
  }

  async function handleMessage({ message, app: _app }) {
    t.equal(_app, app);
    t.equal(message, 'foo');
  }

  async function groupHandler({ messages, app: _app }) {
    t.equal(_app, app);
    t.strictSame(messages, ['bar']);
  }

  try {
    await processMessages({
      messages: ['foo'],
      app,
      partitionMessages,
      handleMessage,
      groupHandler
    });
    t.pass();
  } catch (error) {
    t.error(error);
  }
});

tap.test('uses defaults', async t => {
  const app = {
    emit() {},
    [symbols.symFifoSorter]: () => {}
  };

  try {
    await processMessages({
      messages: [
        { Attributes: { MessageGroupId: 'foo' } },
        { Attributes: { MessageGroupId: 'bar' } }
      ],
      app
    });
    t.pass();
  } catch (error) {
    t.error(error);
  }
});
