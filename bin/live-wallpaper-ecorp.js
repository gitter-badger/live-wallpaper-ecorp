#!/usr/bin/env node

var electronPath = require('electron-prebuilt');
var childProcess = require('child_process');

var args = process.argv.slice(2);  
args.unshift( __dirname + '/../' );

// Run
childProcess.spawn(electronPath, args , {
    stdio: 'inherit'
});