'use strict';

module.exports = function keepAlive() {
  if (this.isRunning === false) {
    return;
  }
  return setImmediate(keepAlive.bind(this));
};
