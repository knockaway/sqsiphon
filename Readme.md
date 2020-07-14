# @knockaway/sqsiphon

_sqsiphon_ is provides a framework for writing [Amazon SQS][sqs] polling
applications. It designed to poll, and process messages, as quickly as possible.
FIFO queues are supported.

[sqs]: https://aws.amazon.com/sqs/

## Queue Processing

1. _sqsiphon_ polls for up to 10 messages (the SQS allowed maximum).
2. The retrieved messages are inspected to determine if any are tagged as being
   members of a FIFO queue.
3. Messages that are not tagged for a FIFO queue are placed into a general
   processing batch. Any FIFO tagged messages are added to a batch specifically
   for the tagged FIFO queue. For example, consider a poll event returns three
   messages: message `A` is untagged, message `B` is tagged for "foo", and
   message `C` is tagged for "bar". Message `A` will be put on the general
   processing batch and two new batches will be created: "foo" and "bar", each
   with one message added for processing.
4. All available processing batches are processed: the general batch's messages
   are processed concurrently, and each FIFO batch is processed sequentially.
5. Messages that generate an error during processing are left on the queue.

**FIFO Errors:** When a message on a FIFO queue cannot be processed successfully,
the message, and any remaining messages in the batch, will be left on the queue.
It is recommened that a corresponding dead letter queue be configured so that
these messages will be moved there by SQS.

## Example

```js
const { SQS } = require('aws-sdk');
const sqs = new SQS({
  apiVersion: '2012-11-05',
  region: 'us-east-1'
});
const sqsiphonFactory = require('@knockaway/sqsiphon');
const app = sqsiphonFactory({
  sqs,
  queueUrl: 'url for the sqs queue',
  handler: messageHandler
});

function shutdown(signal) {
  app.stop();
}
['SIGTERM', 'SIGINT'].forEach(signal => process.on(signal, shutdown));

if ((require.main === module) === true) {
  app.start();
}

async function messageHandler(message) {
  // `message` is an SQS message as returned by the `aws-sdk`
  // ...
  // Do something with the message or `throw Error('failed')`
}
```

## Factory Options

This module exports a factory function which accepts an options object with the
following properties:

- `logger` (optional): An object that follows the Log4j logger interface.
  The default is an instance of [`abstract-logging`](https://npm.im/abstract-logging).
- `sqs` (required): An instance of `SQS` from the [`aws-sdk`](https://npm.im/aws-sdk).
- `queueUrl` (required): A string URL pointing to the SQS instance to poll.
- `handler` (required): A function to handle received messages. Must be an
  `async function`. The function will receive one parameter: `message`. The
  parameter is an instance of
  [SQS Message](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_Message.html).
  If the message cannot be processed for any reason, an instance of `Error`
  should be thrown. If no error is thrown, the message has been considered to
  be successfully processed.
- `tracer` (optional): an OpenTracing compliant tracer instance.
- `receiveMessageParameters` (optional): an object that conforms to the object
  described by
  [`sqs.receiveMessage`](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SQS.html#receiveMessage-property).
  The default has: `AttributeNames: ['All']`, `MaxNumberOfMessages: 10`,
  `MessageAttributeNames: ['All']`, and `VisibilityTimeout: 30`. The `QueueUrl`
  is always overridden by the passed in `queueUrl` value.

## App Instance

The factory returns an application instance. The application instance is
an event emitter.

### Instance Methods And Properties

- `isRunning` (boolean): indicates if the application is polling for messages
  or not.
- `start()`: initiates the application to start polling for messages.
- `stop()`: initiates the application to stop polling for messages. Any
  messages currently being processed will be completed.

### Instance Events

- `error`: fired when an unexpected error occurs. Receives an `Error` object.
- `request-error`: fired when a communication error occurs. Receives an
  `Error` object.
- `processing-error`: fired when an error occurs while processing a message.
  Receives an object with `error` and `message` properties.
- `fifo-processing-aborted`: fired when a FIFO batch stop processing due to an
  error. Receives an object with `message` and `messages` properties. This event
  will fire subsequent to a `processing-error` event.
- `received-messages`: fired when a new batch of messages has been received.
  Receives an array of SQS message objects.
- `handled-message`: fired when a message has been successfully handled.
  Receives an SQS message object.
