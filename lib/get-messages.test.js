'use strict';

const tap = require('tap');
const symbols = require('./symbols');
const getMessages = require('./get-messages');

tap.test('returns error if cannot communicate with sqs', async t => {
  const sqs = {
    receiveMessage() {
      return this;
    },
    promise() {
      return Promise.reject(Error('broken sqs'));
    }
  };
  const app = {
    [symbols.symSQS]: sqs,
    [symbols.symReceiveParams]: { QueueUrl: 'http://sqs.example.com' }
  };

  const response = await getMessages({ app });
  t.match(response, {
    error: {
      message: 'broken sqs'
    }
  });
});

tap.test('returns messages on success', async t => {
  const sqs = {
    receiveMessage(params) {
      t.strictSame(params, { QueueUrl: 'http://sqs.example.com' });
      return this;
    },
    promise() {
      return Promise.resolve({ Messages: [{ message: 'one' }] });
    }
  };
  const app = {
    [symbols.symSQS]: sqs,
    [symbols.symReceiveParams]: { QueueUrl: 'http://sqs.example.com' }
  };

  const response = await getMessages({ app });
  t.strictSame(response, {
    value: [
      {
        message: 'one'
      }
    ]
  });
});

tap.test('returns empty array for no messages in response', async t => {
  const sqs = {
    receiveMessage(params) {
      t.strictSame(params, { QueueUrl: 'http://sqs.example.com' });
      return this;
    },
    promise() {
      return Promise.resolve({});
    }
  };
  const app = {
    [symbols.symSQS]: sqs,
    [symbols.symReceiveParams]: { QueueUrl: 'http://sqs.example.com' }
  };

  const response = await getMessages({ app });
  t.strictSame(response, {
    value: []
  });
});
