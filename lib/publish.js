'use strict';


/**
 * Modules
 * Node
 */
const childProcess = require('child_process'),
    path = require('path'),
    appRoot = require('app-root-path').path;


/**
 * Modules
 * External
 */
const glob = require('glob'),
    request = require('request'),
    publishRelease = require('publish-release'),
    semverUtils = require('semver-utils'),
    chalk = require('chalk');


/**
 * Modules
 * Internal
 */
const packageJson = require(appRoot + '/package.json'),
    logger = require(appRoot + '/lib/logger');


/**
 * Deployment asset list
 */
let assetList = glob.sync(path.join(appRoot, packageJson.build.directoryRelease, '*.zip'));


/**
 * Options for publish-release
 */
let createPublishOptions = function() {
    return {
        token: process.env.GITHUB_TOKEN,
        owner: packageJson.author.name,
        repo: packageJson.name,
        tag: 'v' + packageJson.version,
        name: packageJson.build.productName + ' ' + 'v' + packageJson.version,
        draft: true,
        reuseRelease: true,
        reuseDraftOnly: true,
        assets: assetList,
        target_commitish: 'master'
    };
};


/**
 * Start Publishing
 */
let publish = function() {

    let releaseOptions = createPublishOptions();
    releaseOptions.notes = releaseOptions.name;

    logger.log('Publishing Version', releaseOptions.tag);
    logger.log('Contained binaries', assetList.length);

    if (!releaseOptions.token) {
        logger.logErr('error (variable missing)', 'GITHUB_TOKEN');
        return process.exit(1);
    }

    let release = publishRelease(releaseOptions, function(err) {
        if (err) {
            logger.logErr('error (publishing)', err);
            return process.exit(1);
        }
    });

    let i = 1;
    release.on('create-release', function() {
        logger.log('Starting to publish asset', i + ' of ' + assetList.length);
        i = i + 1;
    });

    release.on('created-release', function() {
        logger.log('Release created', 'https://github.com/' + packageJson.author.name + '/' + packageJson.name + '/releases/tag/' + packageJson.version);
    });

    release.on('upload-asset', function(name) {
        logger.log('Asset upload commencing', name);
    });

    release.on('uploaded-asset', function(name) {
        logger.log('Asset upload complete', name);
    });

    release.on('upload-progress', function(name, progress) {
        logger.log('Asset uploading', name, Math.round(progress.percentage) + '%', '(~' + Math.round(progress.eta / 60) + 'm)');
    });
};


/**
 * Initialize main process if called from CLI
 */
if (require.main === module) {
    publish();
}


/**
 * exports
 */
module.exports = {
    assetList: assetList,
    createPublishOptions: createPublishOptions,
    publish: publish
};
