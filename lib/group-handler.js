'use strict';

const _handleMessage = require('./handle-message');

/**
 * Iterate a FIFO queue of `messages` in sequential order and feed each
 * message through the configured message handler. Any error in processing a
 * message will result in the remaining messages being left unprocessed.
 *
 * @param {object} input
 * @param {object[]} input.messages A set of SQS messages from a FIFO partition.
 * @param {object} input.app A fully configures `sqsiphon` application instance.
 *
 * @fires sqsiphon#fifo-processing-aborted
 */
module.exports = async function groupHandler({ messages, app, handleMessage = _handleMessage }) {
  for (const message of messages) {
    const result = await handleMessage({ message, app });
    if (result === false) {
      app.emit('fifo-processing-aborted', { message, messages });
      break;
    }
  }
};
