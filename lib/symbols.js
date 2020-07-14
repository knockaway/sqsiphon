'use strict';

const symLogger = Symbol('sqsiphon.logger');
const symRunning = Symbol('sqsiphon.isRunning');
const symSQS = Symbol('sqsiphon.sqs');
const symQueueUrl = Symbol('sqsiphon.queueUrl');
const symReceiveParams = Symbol('sqsiphon.receiveParams');
const symHandler = Symbol('sqsiphon.handler');
const symFifoSorter = Symbol('sqsiphon.fifoSorter');
const symTracer = Symbol('sqsiphon.tracer');

module.exports = {
  symLogger,
  symRunning,
  symSQS,
  symQueueUrl,
  symReceiveParams,
  symHandler,
  symFifoSorter,
  symTracer
};
