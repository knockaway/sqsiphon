'use strict';

const { symLogger, symTracer } = require('./symbols');
const _getMessages = require('./get-messages');
const _processMessages = require('./process-messages');

/**
 * Polls for new messages on an SQS queue and processes the messages. Must be
 * invoked with the `this` context set to an "app" instance.
 *
 * @fires sqsiphon#request-error
 * @fires sqsiphon#error
 * @fires sqsiphon#received-messages
 */
module.exports = async function poller({
  getMessages = _getMessages,
  processMessages = _processMessages
} = {}) {
  const app = this;
  const log = app[symLogger];
  const tracer = app[symTracer];

  // TODO: extract any possible parent span and create new one as a child
  const span = tracer.startSpan('sqs_poll');

  log.trace('polling for new messages');
  const getMessagesResult = await getMessages({ app });
  if (getMessagesResult.error) {
    const error = getMessagesResult.error;
    span.setTag('error', true);
    span.log({
      event: 'error',
      'error.object': error,
      message: error.message,
      stack: error.stack
    });

    log.trace('encountered communication error', { error });
    if (app.listenerCount('request-error') > 0) {
      app.emit('request-error', error);
    } else {
      // If the user isn't listening for the specific event we will fallback
      // to the baseline error event so that Node will barf up stacks and such.
      app.emit('error', error);
    }

    span.finish();
    return;
  }

  const messages = getMessagesResult.value;
  if (messages.length === 0) {
    log.trace('zero messages received');
    span.finish();
    return;
  }
  app.emit('received-messages', messages);
  log.trace('processing messages', { messagesCount: messages.length });
  await processMessages({ messages, app });

  span.finish();
};
