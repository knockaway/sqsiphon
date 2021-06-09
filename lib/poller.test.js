'use strict';

const tap = require('tap');
const opentracing = require('opentracing');
const symbols = require('./symbols');
const poller = require('./poller');

tap.test('fires error event if cannot get messages', async t => {
  const app = {
    [symbols.symLogger]: { trace() {} },
    [symbols.symTracer]: new opentracing.MockTracer(),
    listenerCount() {
      return 0;
    },
    emit(event, body) {
      t.equal(event, 'error');
      t.match(body, /broken messages/);
    }
  };
  async function getMessages() {
    return { error: Error('broken messages') };
  }

  const result = await poller.call(app, { getMessages });
  t.equal(result, undefined);
});

tap.test('fires request-error event if cannot get messages and listener registered', async t => {
  const app = {
    [symbols.symLogger]: { trace() {} },
    [symbols.symTracer]: new opentracing.MockTracer(),
    listenerCount(event) {
      t.equal(event, 'request-error');
      return 1;
    },
    emit(event, body) {
      t.equal(event, 'request-error');
      t.match(body, /broken messages/);
    }
  };
  async function getMessages() {
    return { error: Error('broken messages') };
  }

  const result = await poller.call(app, { getMessages });
  t.equal(result, undefined);
});

tap.test('merely logs when no messages to process', async t => {
  const app = {
    [symbols.symLogger]: {
      trace(msg) {
        t.ok(['polling for new messages', 'zero messages received'].includes(msg));
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
  t.equal(result, undefined);
});

tap.test('emits received-messages and invoked processor', async t => {
  const app = {
    [symbols.symLogger]: {
      trace(msg) {
        t.ok(['polling for new messages', 'processing messages'].includes(msg));
      }
    },
    [symbols.symTracer]: new opentracing.MockTracer(),
    listenerCount() {
      t.fail('should not be invoked');
    },
    emit(event, body) {
      t.equal(event, 'received-messages');
      t.strictSame(body, [{ foo: 'foo' }]);
    }
  };
  async function getMessages({ app: _app }) {
    t.equal(_app, app);
    return { value: [{ foo: 'foo' }] };
  }
  async function processMessages({ messages, app: _app }) {
    t.equal(_app, app);
    t.strictSame(messages, [{ foo: 'foo' }]);
  }

  const result = await poller.call(app, { getMessages, processMessages });
  t.equal(result, undefined);
});

tap.test('uses defaults', async t => {
  const app = {
    emit() {},
    [symbols.symLogger]: { trace() {} },
    [symbols.symTracer]: {
      startSpan() {
        return {
          setTag() {},
          log() {},
          finish() {}
        };
      }
    },
    [symbols.symSQS]: {
      receiveMessage() {
        t.pass();
        return this;
      },
      promise() {
        t.pass();
        return { Messages: [{ foo: 'foo' }] };
      }
    }
  };

  const result = await poller.call(app);
  t.equal(result, undefined);
});
