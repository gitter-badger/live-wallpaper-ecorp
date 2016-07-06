'use strict';


const TARGET_DISPLAY_INDEX = 0;


// Module to control application life.
const electron = require('electron')
const { app, BrowserWindow, Tray, Menu } = electron;

// Modules (Node)
const path = require('path');

// Modules (External)
const appRoot = require('app-root-path').path;

// Modules (Internal)
const packageJson = require('../package.json'),
    logger = require('../lib/logger'),
    platform = require('../lib/platform');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow,
    mainPage,
    sysTray;
    
// App Constants
const appUrl = 'file://' + appRoot + '/app/index.html',
    appName = packageJson.name,
    appVersion = packageJson.version;

// Icons
let appIcon = path.join(appRoot, 'icons', platform.type, 'icon-app' + platform.icon(platform.type)),
    trayIconDefault = path.join(appRoot, 'icons', platform.type, 'icon-tray' + platform.image(platform.type)),
    trayIconActive = path.join(appRoot, 'icons', platform.type, 'icon-tray-active' + platform.image(platform.type));

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', function() {
    // Create the browser window.
    let displays = electron.screen.getAllDisplays();
    let mainDisplay = displays[0];
    let targetDisplay = displays[TARGET_DISPLAY_INDEX] || mainDisplay;

    mainWindow = new BrowserWindow({
        show: false,
        hasShadow: false,
        movable: false,
        resizable: false,
        frame: false,
        type: 'desktop',
        x: targetDisplay.bounds.x,
        y: targetDisplay.bounds.y,
        width: targetDisplay.bounds.width,
        height: targetDisplay.bounds.height
    });

    // and load the index.html of the app.
    mainWindow.loadURL(appUrl);
    mainPage = mainWindow.webContents;

    // Emitted when the window is closed.
    mainWindow.on('closed', function() {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null;
    });
    
    // Listens for mainPage:dom-ready.
    mainPage.on('dom-ready', () => {
        mainWindow.show();

        // Open the DevTools.
        //mainPage.openDevTools();
    });
    
    // Inits Tray.
    sysTray = new Tray(trayIconDefault);
    sysTray.setImage(trayIconDefault);
    sysTray.setToolTip(appName);
    sysTray.setContextMenu(Menu.buildFromTemplate([
        {
            label: appName + ' ' + appVersion, enabled: false
        },
        { 
            type: 'separator'
        },
        { 
            label: 'Quit', click() { app.quit(); }
        }
    ]));
    
    if (platform.isOSX) {
        app.dock.hide();
    }
});

// Quit when all windows are closed.
app.on('window-all-closed', function() {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function() {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow();
    }
});

// Quit when all windows are closed.
app.on('window-all-closed', function() {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (platform.type !== 'darwin') {
        app.quit();
    }
});