'use strict';

const tap = require('tap');
const symbols = require('./symbols');
const groupHandler = require('./group-handler');

tap.test('emits aborted for failed handler', async t => {
  const app = {
    emit(event, body) {
      t.equal(event, 'fifo-processing-aborted');
      t.strictSame(body, { message: 'foo', messages: ['foo'] });
    }
  };
  async function handleMessage() {
    return false;
  }

  await groupHandler({ messages: ['foo'], app, handleMessage });
});

tap.test('does not emit for all successes', async t => {
  const app = {
    emit() {
      t.fail('should not be invoked');
    }
  };
  async function handleMessage(params) {
    t.equal(params.app, app);
    t.equal(params.message, 'foo');
    return true;
  }

  await groupHandler({ messages: ['foo'], app, handleMessage });
});

tap.test('default handler is used correctly', async t => {
  t.plan(4);

  const app = {
    emit() {
      t.pass();
    },
    [symbols.symHandler]: function () {
      t.pass();
    },
    [symbols.symSQS]: {
      deleteMessage() {
        t.pass();
        return this;
      },
      promise() {
        t.pass();
        return this;
      }
    }
  };

  await groupHandler({ messages: ['foo'], app });
});
