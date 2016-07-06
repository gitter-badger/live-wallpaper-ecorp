'use strict';


/**
 * Modules
 * Node
 */
const path = require('path');


/**
 * Modules
 * External
 */
const _ = require('lodash'),
    chalk = require('chalk');


/**
 * String Proper Case converter
 */
String.prototype.toProperCase = function() {
    return this.replace(/\w\S*/g, function(txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
};


/**
 * Format log messages
 * @param {...*} arguments - Messages or entities to print.
 * @returns {Object}
 */
let format = function() {
    let args = Array.from(arguments);

    let title = args[0] || ' ',
        text = [];

    for (let value of args.slice(1)) {
        if (_.isPlainObject(value)) {
            text.push('\r\n' + JSON.stringify(value, null, 4) + '\r\n');
        } else {
            text.push(value);
        }
    }

    return {
        prefix: '[' + path.basename(module.parent.filename) + ']',
        title: title.toProperCase(),
        text: text.join(' ')
    };
};

/**
 * Error Logger
 * @param {...*} arguments - Error Messages or entities to print.
 */
let logErr = function() {
    console.log(chalk.red.bold.inverse(format.apply(this, arguments).prefix) + ' ' + chalk.red.bold.inverse(format.apply(this, arguments).title) + ' ' + chalk.red.bold(format.apply(this, arguments).text));
};


/**
 * Status Logger
 * @param {...*} arguments - Messages or entities to print.
 */
let log = function() {
    console.log(chalk.cyan.bold.inverse(format.apply(this, arguments).prefix) + ' ' + chalk.cyan.bold.inverse(format.apply(this, arguments).title) + ' ' + chalk.cyan.bold(format.apply(this, arguments).text));
};


/**
 * exports
 */
module.exports = {
    log: log,
    logErr: logErr
};
