'use strict';

const _partitionMessages = require('./partition-messages');
const _handleMessage = require('./handle-message');
const _groupHandler = require('./group-handler');
const { symFifoSorter } = require('./symbols');

/**
 * Iterates a set of SQS `messages` and feeds them through the configured
 * message handler.
 *
 * @param {object} input
 * @param {object[]} input.messages An array of SQS messages.
 * @param {object} input.app A fully configured `sqsiphon` application instance.
 */
module.exports = async function processMessages({
  messages,
  app,
  partitionMessages = _partitionMessages,
  handleMessage = _handleMessage,
  groupHandler = _groupHandler
}) {
  const partitions = partitionMessages({ messages });
  const { default: defaultPartition, ...fifoPartitions } = partitions;

  // We can process the default queue concurrently because it does not contain
  // any FIFO queue messages.
  const promises = defaultPartition.map(msg => handleMessage({ message: msg, app }));
  await Promise.all(promises);

  // For FIFO queues we need to process each queue's messages sequentially.
  // We also need to _stop_ processing a queue if one of the messages is not
  // handled correctly.
  const fifoSorter = app[symFifoSorter];
  const fifoPromises = [];
  for (const partitionId in fifoPartitions) {
    const messages = fifoPartitions[partitionId].sort(fifoSorter);
    fifoPromises.push(groupHandler({ messages, app }));
  }
  await Promise.all(fifoPromises);
};
