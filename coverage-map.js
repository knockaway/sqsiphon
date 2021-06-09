'use strict';

/**
 * See https://node-tap.org/docs/coverage/coverage-map/
 */
module.exports = testFile => testFile.replace(/\.test\.js$/, '.js');
