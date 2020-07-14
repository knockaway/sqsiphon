'use strict';

const { symHandler, symQueueUrl, symSQS } = require('./symbols');

/**
 * Invokes the user supplied message handler function and removes the message
 * from the queue if the handler succeeds.
 *
 * @param {object} input
 * @param {object} input.message An SQS message object.
 * @param {object} input.app A fully configured `sqsiphon` instance.
 *
 * @fires sqsiphon#handled-message
 * @fires sqsiphon#processing-error
 *
 * @returns {boolean} `true` if no error occured, `false` otherwise.
 */
module.exports = async function handleMessage({ message, app }) {
  const sqs = app[symSQS];
  const queueUrl = app[symQueueUrl];
  const handler = app[symHandler];

  try {
    await handler(message);
    await sqs
      .deleteMessage({ QueueUrl: queueUrl, ReceiptHandle: message.ReceiptHandle })
      .promise();
    app.emit('handled-message', { message });
  } catch (error) {
    app.emit('processing-error', { error, message });
    return false;
  }

  return true;
};
