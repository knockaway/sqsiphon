'use strict';

/**
 * Given an array of SQS message instances, iterate the messages to look for
 * FIFO group identifier attributes. For messages that do not have such
 * identifiers, add them to a default partition. For messages that do have
 * such identifiers, segregate each message into a parition matching the FIFO
 * group identifier of the message.
 *
 * @param {object} input
 * @param {object[]} input.messages An array of SQS message objects.
 *
 * @returns {object} Standard, non-FIFO, messages are attached to the "default"
 * property (partition). Any other properties on this object match the found
 * FIFO group identifiers. Each property on the object is an array of SQS
 * messages.
 */
module.exports = function partitionMessages({ messages }) {
  const partitions = {
    default: []
  };
  for (const message of messages) {
    if (!message.Attributes || !message.Attributes.MessageGroupId) {
      partitions.default.push(message);
      continue;
    }
    const groupId = message.Attributes.MessageGroupId;
    const queue = partitions[groupId];
    if (Array.isArray(queue)) {
      queue.push(message);
    } else {
      partitions[groupId] = [message];
    }
  }
  return partitions;
};
