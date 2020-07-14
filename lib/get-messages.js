'use strict';

const { symReceiveParams, symSQS } = require('./symbols');

/**
 * Query the configures SQS queue for new messages.
 *
 * @param {object} input
 * @param {object} input.app An `sqsiphon` application instance that has an
 * associated SQS client instance and message receive parameters object.
 *
 * @returns {object} Will have an `error` property if there was a communication
 * error with AWS. Otherwise, will have a `value` property set to an array
 * of SQS messages.
 */
module.exports = async function getMessages({ app }) {
  const sqs = app[symSQS];
  const rececieveParams = app[symReceiveParams];
  const messages = [];

  try {
    const response = await sqs.receiveMessage(rececieveParams).promise();
    Array.prototype.push.apply(messages, response.Messages || []);
  } catch (error) {
    return { error };
  }

  return { value: messages };
};
