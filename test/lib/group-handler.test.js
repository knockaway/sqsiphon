'use strict';

const tap = require('tap');
const groupHandler = require('../../lib/group-handler');

tap.test('emits aborted for failed handler', async t => {
  const app = {
    emit(event, body) {
      t.is(event, 'fifo-processing-aborted');
      t.deepEqual(body, { message: 'foo', messages: ['foo'] });
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
    t.is(params.app, app);
    t.is(params.message, 'foo');
    return true;
  }

  await groupHandler({ messages: ['foo'], app, handleMessage });
});
