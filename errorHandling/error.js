const moment = require('moment');

/**
 * Domain object for a single API error.
 * This object takes a message and a status code.
 * The timestamp is automatically generated with moment.js.
 */
class Error {
    constructor(message, code) {
        this.message = message;
        this.code = code;
        this.timestamp = moment().format();
    }
}

module.exports = Error;