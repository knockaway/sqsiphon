'use strict';

const tap = require('tap');
const opentracing = require('opentracing');
const symbols = require('../../lib/symbols');
const poller = require('../../lib/poller');

tap.test('fires error event if cannot get messages', async t => {
  const app = {
    [symbols.symLogger]: { trace() {} },
    [symbols.symTracer]: new opentracing.MockTracer(),
    listenerCount() {
      return 0;
    },
    emit(event, body) {
      t.is(event, 'error');
      t.match(body, /broken messages/);
    }
  };
  async function getMessages() {
    return { error: Error('broken messages') };
  }

  const result = await poller.call(app, { getMessages });
  t.is(result, undefined);
});

tap.test('fires request-error event if cannot get messages and listener registered', async t => {
  const app = {
    [symbols.symLogger]: { trace() {} },
    [symbols.symTracer]: new opentracing.MockTracer(),
    listenerCount(event) {
      t.is(event, 'request-error');
      return 1;
    },
    emit(event, body) {
      t.is(event, 'request-error');
      t.match(body, /broken messages/);
    }
  };
  async function getMessages() {
    return { error: Error('broken messages') };
  }

  const result = await poller.call(app, { getMessages });
  t.is(result, undefined);
});

tap.test('merely logs when no messages to process', async t => {
  const app = {
    [symbols.symLogger]: {
      trace(msg) {
        t.true(['polling for new messages', 'zero messages received'].includes(msg));
      }
    },
    [symbols.symTracer]: new opentracing.MockTracer(),
    listenerCount() {
      t.fail('should not be invoked');
    },
    emit() {
      t.fail('should not be invoked');
    }
  };
  async function getMessages() {
    return { value: [] };
  }

  const result = await poller.call(app, { getMessages });
  t.is(result, undefined);
});

tap.test('emits received-messages and invoked processor', async t => {
  const app = {
    [symbols.symLogger]: {
      trace(msg) {
        t.true(['polling for new messages', 'processing messages'].includes(msg));
      }
    },
    [symbols.symTracer]: new opentracing.MockTracer(),
    listenerCount() {
      t.fail('should not be invoked');
    },
    emit(event, body) {
      t.is(event, 'received-messages');
      t.deepEqual(body, [{ foo: 'foo' }]);
    }
  };
  async function getMessages({ app: _app }) {
    t.is(_app, app);
    return { value: [{ foo: 'foo' }] };
  }
  async function processMessages({ messages, app: _app }) {
    t.is(_app, app);
    t.deepEqual(messages, [{ foo: 'foo' }]);
  }

  const result = await poller.call(app, { getMessages, processMessages });
  t.is(result, undefined);
});
