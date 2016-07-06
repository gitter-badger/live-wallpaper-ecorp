'use strict';


/**
 * Modules
 * Node
 */
const fs = require('fs'),
    path = require('path'),
    mkdirp = require('mkdirp');


/**
 * Modules
 * External
 */
const rimraf = require('rimraf'),
    ZipPaths = require('zip-paths'),
    filesize = require('filesize'),
    say = require('say'),
    appRoot = require('app-root-path').path,
    git = require('git-rev-sync');


/**
 * Modules
 * Build
 */
const packager = require('electron-packager'),
    darwinInstaller = require('appdmg'),
    windowsInstaller = require('electron-winstaller'),
    linuxInstaller = require('electron-installer-debian');


/**
 * Modules
 * Internal
 */
const packageJson = require(appRoot + '/package.json'),
    platform = require(appRoot + '/lib/platform'),
    logger = require(appRoot + '/lib/logger');


/**
 * Options for electron-packager
 */
let createBuildOptions = function(platformName) {

    let branch = git.branch(),
        commit = git.short();

    let appVersion = packageJson.version,
        appBuildVersion = branch + '-' + commit;

    return {
        'dir': appRoot,
        'out': path.join(appRoot, packageJson.build.directoryStaging),
        'icon': path.join(appRoot, 'icons', platformName, 'icon-app' + platform.icon(platformName)),
        'iconUrl': packageJson.build.iconUrl,
        'platform': platformName,
        'arch': 'all',
        'prune': true,
        'asar': true,
        'overwrite': true,
        'name': packageJson.build.productName,
        'version': packageJson.build.electronVersion,
        'app-version': appVersion,
        'build-version': appBuildVersion,
        'app-bundle-id': packageJson.build.id,
        'app-company': packageJson.build.company,
        'app-category-type': packageJson.build.category,
        'helper-bundle-id': packageJson.build.id + '.helper',
        'app-copyright': 'Copyright © ' + new Date().getFullYear(),
        'download': {
            'cache': path.join(appRoot, packageJson.build.directoryCache),
            'strictSSL': false
        },
        'version-string': {
            'FileDescription': packageJson.build.productDescription
        },
        'description': packageJson.build.productDescription,
        'ignore': [
            path.basename(packageJson.build.directoryStaging) + '($|/)',
            path.basename(packageJson.build.directoryRelease) + '($|/)',
            path.basename(packageJson.build.directoryCache) + '($|/)',
            '/resources($|/)',
            platformName !== 'darwin' ? '/icons/darwin($|/)' : null,
            platformName !== 'win32' ? '/icons/win32($|/)' : null,
            platformName !== 'linux' ? '/icons/linux($|/)' : null,
            '/\\.DS_Store($|/)', '/\\.editorconfig($|/)', '/\\.gitignore($|/)', '/\\.idea($|/)', '/\\.jscsrc($|/)', '/\\.jshintrc($|/)', '/\\.npmignore($|/)'
        ]
    };
};


/**
 * Commandline platform override (default: build all platforms)
 * @example > npm run build darwin
 * @example > npm run build win32
 */
let platformListCli = function() {
    return process.argv.slice(3);
};


/**
 * Create files / folders
 * @param {...*} arguments - Filesystem paths
 */
let createOnFilesystem = function() {
    let args = Array.from(arguments);
    for (let value of args) {
        mkdirp.sync(path.resolve(value));
        logger.log('Creating', path.resolve(value));
    }
};


/**
 * Delete folders / files recursively
 * @param {...*} arguments - Filesystem paths
 */
let deleteFromFilesystem = function() {
    let args = Array.from(arguments);
    for (let value of args) {
        rimraf.sync(path.resolve(value) + '/**/*');
    }
};


/**
 * Zip folders
 * @param {String} sourceFilepath - Directory to compress
 * @param {String=} allowedExtension - Restrict inclusion to files with this extension (e.g. '.exe')
 * @param {String} platformName - Current Platform
 */
let moveFolderToPackage = function(sourceFilepath, allowedExtension, platformName) {

    let source = path.resolve(sourceFilepath),
        sourceBasepath = path.dirname(source),
        sourceGlob = fs.statSync(source).isDirectory() === true ? path.basename(source) + '/**/*' : path.basename(source),
        targetExtension = '.zip',
        outputFile = path.join(path.dirname(source), path.basename(source)) + targetExtension;

    let inputPattern = allowedExtension ? sourceGlob + '*' + allowedExtension : sourceGlob;

    // Packing a directory
    let zip = new ZipPaths(outputFile);

    zip.add(inputPattern,
        {
            cwd: sourceBasepath
        }, function(err) {
            if (err) {
                return logger.logErr('error (packaging)', err);
            }
            zip.compress(function(err, bytes) {
                if (err) {
                    return logger.logErr('error (compression)', err);
                }
                rimraf.sync(source);

                logger.log('package ready', platformName + ' (' + path.basename(outputFile) + ', ' + filesize(bytes, { base: 10 }) + ')');
            });
        });
};


/**
 * Platform Target List
 */
let platformList = function() {
    if ((platformListCli() !== 'undefined') && (platformListCli().length > 0)) {
        return platformListCli();
    }
    return packageJson.build.platforms;
};


/**
 * Darwin Deployment
 * @param {Array} buildArtifactList - Directory to compress
 * @param {Object} buildOptions - electron-packager options object
 * @param {String} platformName - Current Platform
 * @param {String} deployFolder - Deployment parent folder
 */
let deployDarwin = function(buildArtifactList, buildOptions, platformName, deployFolder) {

    buildArtifactList.forEach(function(buildArtifact) {

        // Deployment: Input folder
        let inputFolder = path.join(buildArtifact, buildOptions.name + '.app');

        // Deployment: Target folder
        let deploySubfolder = path.join(path.resolve(deployFolder), path.basename(buildArtifact).replace(/\s+/g, '_').toLowerCase() + '-v' + buildOptions['app-version']);

        // Deployment: Installer extension
        let deployExtension = '.dmg';

        // Deployment: Options
        let deployOptions = {
            target: path.join(deploySubfolder, path.basename(deploySubfolder) + deployExtension),
            basepath: '',
            specification: {
                'title': buildOptions['name'],
                'icon': path.join(appRoot, 'icons', platformName, 'icon-installation' + platform.icon(platformName)),
                'background': path.join(appRoot, 'icons', platformName, 'background-installation.png'),
                'contents': [
                    { "x": 1000, "y": 1000, "type": "position", "path": ".background" },
                    { "x": 1000, "y": 1000, "type": "position", "path": ".DS_Store" },
                    { "x": 1000, "y": 1000, "type": "position", "path": ".Trashes" },
                    { "x": 1000, "y": 1000, "type": "position", "path": ".VolumeIcon.icns" },
                    { 'x': 448, 'y': 344, 'type': 'link', 'path': '/Applications' },
                    { 'x': 192, 'y': 344, 'type': 'file', 'path': inputFolder },
                ]
            }
        };

        // Deployment: Subfolder
        deleteFromFilesystem(deploySubfolder);
        createOnFilesystem(deploySubfolder);

        // Deployment: Start
        let deployHelper = darwinInstaller(deployOptions);

        // Deployment: Result
        deployHelper.on('finish', function() {
            moveFolderToPackage(deploySubfolder, deployExtension, platformName);
        });
        deployHelper.on('error', function(err) {
            logger.log('Error (Deploy)', err);
            return process.exit(1);
        });
    });
};


/**
 * Windows Deployment
 * @param {Array} buildArtifactList - Directory to compress
 * @param {Object} buildOptions - electron-packager options object
 * @param {String} platformName - Current Platform type
 * @param {String} deployFolder - Deployment parent folder
 */
let deployWindows = function(buildArtifactList, buildOptions, platformName, deployFolder) {

    buildArtifactList.forEach(function(buildArtifact) {

        // Deployment: Input folder
        let inputFolder = path.join(buildArtifact);

        // Deployment: Target folder
        let deploySubfolder = path.join(path.resolve(deployFolder), path.basename(buildArtifact).replace(/\s+/g, '_').toLowerCase() + '-v' + buildOptions['app-version']);

        // Deployment: Installer extension
        let deployExtension = '.exe';

        // Deployment: Options
        let deployOptions = {
            appDirectory: inputFolder,
            outputDirectory: deploySubfolder,
            setupExe: path.basename(buildArtifact).replace(/\s+/g, '_').toLowerCase() + deployExtension,
            exe: buildOptions['name'] + '.exe',
            authors: buildOptions['app-company'],
            title: buildOptions['name'],
            iconUrl: buildOptions['iconUrl'],
            setupIcon: buildOptions['icon'],
            description: buildOptions['description']
        };

        // Deployment: Subfolder
        deleteFromFilesystem(deploySubfolder);
        createOnFilesystem(deploySubfolder);

        // Deployment: Start
        let deployHelper = windowsInstaller.createWindowsInstaller(deployOptions);

        // Deployment: Result
        deployHelper.then(function() {
            moveFolderToPackage(deploySubfolder, deployExtension, platformName);
        }, function(err) {
            logger.logErr('error (deploy)', err);
            return process.exit(1);
        });
    });
};


/**
 * Linux  Deployment
 * @param {Array} buildArtifactList - Directory to compress
 * @param {Object} buildOptions - electron-packager options object
 * @param {String} platformName - Current Platform type
 * @param {String} deployFolder - Deployment parent folder
 */
let deployLinux = function(buildArtifactList, buildOptions, platformName, deployFolder) {

    buildArtifactList.forEach(function(buildArtifact) {

        // Deployment: Input folder
        let inputFolder = path.join(buildArtifact);

        // Deployment: Target folder
        let deploySubfolder = path.join(path.resolve(deployFolder), path.basename(buildArtifact).replace(/\s+/g, '_').toLowerCase() + '-v' + buildOptions['app-version']);

        // Deployment: Installer extension
        let deployExtension = '.deb';

        // Deployment: Options
        let deployOptions = {
            src: inputFolder,
            dest: deploySubfolder,
            bin: buildOptions['name']
        };

        // Deployment: Subfolder
        deleteFromFilesystem(deploySubfolder);
        createOnFilesystem(deploySubfolder);

        // Deployment: Start
        linuxInstaller(deployOptions, function(err) {
            if (!err) {
                return moveFolderToPackage(deploySubfolder, deployExtension, platformName);
            } else {
                logger.logErr('error (deploy)', err);
                return process.exit(1);
            }
        });
    });
};


/**
 * Start Building
 */
let build = function() {

    /**
     * Print Info
     */
    logger.log('Project', packageJson.build.productName, packageJson.version);
    logger.log('Target Platforms', platformList().join(', '));

    /**
     * Prepare Directories
     */
    deleteFromFilesystem(packageJson.build.directoryStaging, packageJson.build.directoryRelease);
    createOnFilesystem(packageJson.build.directoryStaging, packageJson.build.directoryRelease);

    /**
     * Building
     */
    platformList().forEach(function(target) {
        let options = createBuildOptions(target);

        // Build Options
        //logger.log('Options for ' + target, options);

        packager(options, function(err, result) {

            if (err) {
                logger.logErr('error (build)', err);
                return process.exit(1);
            }

            logger.log('build complete', target);

            /**
             * Trigger Deploy
             */
            if (target.startsWith('darwin')) {
                deployDarwin(result, options, target, packageJson.build.directoryRelease);
            } else if (target.startsWith('win')) {
                deployWindows(result, options, target, packageJson.build.directoryRelease);
            } else if (target.startsWith('linux')) {
                deployLinux(result, options, target, packageJson.build.directoryRelease);
            }
        });
    }, this);
};


/**
 * Initialize main process if called from CLI
 */
if (require.main === module) {
    build();
}


/**
 * exports
 */
module.exports = {
    build: build
};
