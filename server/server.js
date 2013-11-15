var express = require('express'); // Routing framework. http://expressjs.com/
var http = require('http'); // HTTP support. http://nodejs.org/api/http.html
var fs = require('node-fs'); // Recursive directory creation. https://github.com/bpedro/node-fs
var osc = require('node-osc'); // OSC server. https://github.com/TheAlphaNerd/node-osc
var _ = require('underscore'); // Utilities. http://underscorejs.org/
var Backbone = require('backbone'); // Data model utilities. http://backbonejs.org/

// Load config file.
try {
    global.config = JSON.parse(fs.readFileSync('./config.json'));
} catch (error) {
    console.log("Couldn't load config file.");
    console.log(error);
    process.exit(1);
}

// Set up server.
var app = express();
var server = http.createServer(app);
global.io = require('socket.io').listen(server);
io.set('log level', 2);
server.listen(3000);

// Set up OSC server to receive messages from app.
global.oscClient = new osc.Client('127.0.0.1', 3002);
global.oscServer = new osc.Server(3001);
oscServer.on('message', function(msg, rinfo) {
    console.log(msg);
    // Convert OSC messages to objects and emit them similar to sockets.
    var parts = msg[0].substr(1).split('/');
    var action = parts.shift();

    var message = {};
    while (parts.length) {
        var key = parts.shift();
        var val = parts.shift();
        var f = parseFloat(val);
        message[key] = isNaN(f) ? val : f;
    }

    oscServer.emit(action, message);
});

// Set up view routing.
app.use('/static', express.static(__dirname + '/view'));
app.get('/', function(req, res) {
    res.sendfile(__dirname + '/view/index.html');
});

// Set up models.
var ServerState = require('./model/serverState.js').ServerState;
var serverState = new ServerState();

var AppState = require('./model/appState.js').AppState;
var appState = new AppState();

// Update clients with server state when they ask for it, throttled to 60 FPS.
var throttle = 1000 / 60;
io.sockets.on('connection', function(socket) {
    socket.on('getServerState', function(message) {
        clearInterval(socket.serverTimeout);
        socket.serverTimeout = setTimeout(function() {
            socket.emit('serverState', serverState.xport());
        }, throttle);
    });

    socket.on('getAppState', function(message) {
        clearInterval(socket.appTimeout);
        socket.appTimeout = setTimeout(function() {
            socket.emit('appState', appState.xport());
        }, throttle);
    });
});

oscServer.on('getAppState', function(message) {
    clearInterval(oscClient.appTimeout);
    oscClient.appTimeout = setTimeout(function() {
        oscClient.send('/appState/' + JSON.stringify(appState.xport()));
    }, throttle);
});

oscServer.on('getServerState', function(message) {
    clearInterval(oscClient.serverTimeout);
    oscClient.serverTimeout = setTimeout(function() {
        oscClient.send('/serverState/' + JSON.stringify(serverState.xport()));
    }, throttle);
});

///// Client
// Send to local and remote
// Only listen to remote
// Handle connection failures (looping scheme might prevent...)

///// Support multiple clients
// Each client connects with a config, including its network path for updating content

///// Updater
// Kill/start button
// Update button: kill process, update content, update client, restart client
// Update server
// Support to update from non-web location

///// App controller
// Monitor process
// Restart on hang
// Give up restart after n times

///// Server
// Schedule content update (shut down before, restart after)
// Schedule shutdown/restart
// Run as service? https://npmjs.org/package/node-windows

///// Logger
// Server listens to events from updater/controller and sends those to logger
// Logger listens on a port for log messages

///// Monitor
// Monitor listens on a port for monitor messages
// Revisit ICE for patterns

///// UI
// shut down / start (toggle)
// update (show progress)
// Display monitor status
// Display recent logs
// Memory/CPU usage https://github.com/markitondemand/node-perfmon

///// Central UI
// Forward all messages to another instance of server?
// UI displays all inputs at once?
// Send commands (shutdown etc) back to clients?

///// Plugin for custom app logic
// Short term -- extend serverState class
// Long term -- define a set of properties/types/intervals to keep in sync across clients.

///// Analytics
// Hook into analytics service? Or log analysis tool?

///// V.next
// Try to reduce export payload
