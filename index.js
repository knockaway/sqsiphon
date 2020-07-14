'use strict';

const { EventEmitter } = require('events');
const opentracing = require('opentracing');
const poller = require('./lib/poller');
const keepAlive = require('./lib/keep-alive');

const {
  symFifoSorter,
  symHandler,
  symLogger,
  symQueueUrl,
  symReceiveParams,
  symRunning,
  symSQS,
  symTracer
} = require('./lib/symbols');

/**
 * A utility that polls an AWS SQS queue for new messages and feeds them through
 * a processor. It processes standard queue messages concurrently, but processes
 * FIFO based queues in sequential order per partition.
 *
 * @typedef sqsiphon
 */
const proto = Object.create(EventEmitter.prototype, {
  [Symbol.toStringTag]: { value: 'sqsiphon' },

  [symRunning]: { value: false, writable: true },
  /**
   * Indicates if the instance is polling for new messages.
   *
   * @memberof sqsiphon
   * @instance
   */
  isRunning: {
    get() {
      return this[symRunning];
    }
  },

  /**
   * Initiates polling for new messages.
   *
   * @memberof sqsiphon
   * @instance
   */
  start: {
    value: function start() {
      if (this.isRunning) {
        return;
      }
      this[symRunning] = true;
      keepAlive.call(this);

      setImmediate(doPoll.bind(this));

      async function doPoll() {
        if (this.isRunning === false) {
          return;
        }
        await poller.call(this);
        setImmediate(doPoll.bind(this));
      }
    }
  },

  /**
   * Stops polling for new messages.
   *
   * @memberof sqsiphon
   * @instance
   */
  stop: {
    value: function stop() {
      this[symRunning] = false;
    }
  }
});

/**
 * Fired when an unexpected error has occured.
 *
 * @event sqsiphon#error
 * @type {Error}
 */

/**
 * Fired when a communication error has occurred when attempting to retrieve
 * messages from SQS.
 *
 * @event sqsiphon#request-error
 * @type {Error}
 */

/**
 * Fired when an error has occurred while handling a message. Either the
 * message handler has failed or we were unable to delete the message from
 * the queue.
 *
 * @event sqsiphon#processing-error
 * @type {object}
 * @property {Error} error
 * @property {object} message The message that was being processed when the
 * erorr occurred.
 */

/**
 * Fired when the processing of a FIFO partition has been stopped due to a
 * message handling error. The {@see sqsiphon#processing-error} event will be
 * fired alongside this event.
 *
 * @event sqsiphon#fifo-processing-aborted
 * @type {object}
 * @property {object} message The message that was being handled when the
 * error occurred.
 * @property {object[]} messages The queue of messages that was being processed.
 */

/**
 * Fired when a new batch of messages has been received from SQS.
 *
 * @event sqsiphon#received-messages
 * @type {object[]} An array of SQS message objects.
 */

/**
 * Fired when a message has been successfully handled by the user provided
 * handler function.
 *
 * @event sqsiphon#handled-message
 * @type {object} The SQS message that was handled.
 */

/** */
const defaultOptions = {
  logger: require('abstract-logging'),
  sqs: undefined,
  queueUrl: undefined,
  handler: undefined,
  receiveMessageParameters: {
    AttributeNames: ['All'],
    MaxNumberOfMessages: 10,
    MessageAttributeNames: ['All'],
    VisibilityTimeout: 30
  },
  fifoSorter: () => {},
  tracer: undefined
};

module.exports = function sqsiphonFactory(options) {
  const opts = Object.assign({}, defaultOptions, options);

  let tracer;
  if (opts.tracer) {
    opentracing.initGlobalTracer(opts.tracer);
    tracer = opentracing.globalTracer();
  } else {
    tracer = new opentracing.Tracer();
  }

  const { sqs, queueUrl, handler, fifoSorter, logger } = opts;
  if (!sqs) {
    throw Error('must supply `sqs` instance');
  }
  if (!queueUrl || typeof queueUrl !== 'string') {
    throw Error('must supply string for `queueUrl`');
  }
  if (!handler || Function.prototype.isPrototypeOf(handler) === false) {
    throw Error('must provide `handler` function');
  }

  const receiveParams = { QueueUrl: queueUrl, ...opts.receiveMessageParameters };

  const app = Object.create(proto, {
    [symLogger]: { value: logger },
    [symHandler]: { value: handler },
    [symSQS]: { value: sqs },
    [symQueueUrl]: { value: queueUrl },
    [symReceiveParams]: { value: receiveParams },
    [symFifoSorter]: { value: fifoSorter },
    [symTracer]: { value: tracer }
  });
  return app;
};
