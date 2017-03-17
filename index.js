var fs = require('fs');
var path = require('path');

interfaces = {};

commandRefs = {};
savedOptions = {};

module.exports = function() {
	this.registerCommand = registerCommand;
	this.runCommand = runCommand;
	this.reload = reload;
	start(this);
};

/**
 * Starts Pond delegation service
 * @param  {Object} self - The module.exports for the service
 */
function start(self) {
	fs.readdir('./commands/', function(err, files) {
		for(var i = 0, l = files.length; i < l; ++i) {
			var stats = fs.statSync('./commands/' + files[i]);
			if(stats.isDirectory()) {
				commandRefs[files[i]] = new require('./commands/' + files[i] + '/index.js')();
				if(savedOptions && savedOptions[files[i]]) {
					commandRefs[files[i]].setOptions(savedOptions[files[i]]);
				}
			}
		}
		fs.readFile('./config.json', 'utf8', function(err, data) {
			if(err) {
				console.log(err);
				process.exit();
			} else {
				var result = JSON.parse(data);
				for(var key in result) {
					interfaces[key] = new require("./interfaces/" + key + "/main.js")(result[key], self);
				}
			}
		});
		fs.readdir('./channels/', function(err, files) {
			for(var i = 0, l = files.length; i < l; ++i) {
				fs.readFile('./channels/' + files[i], function(error, response) {
					var config = JSON.parse(response);
					for(var key in config) {
						if(key != "channel") {
							interfaces[key].addChannel(config[key]);
						}
					}
				});
			}
		});
	});
}

/**
 * Creates (or optionally replaces) reference to a command object
 * @param  {Object} options - Options for how how to add command
 * @param  {string} options.command - Folder name containing a commands index.js
 * @param  {boolean=} [options.reload=false] - Will load an uncached copy of the command
 * @param  {Object} options.interface - Information about service
 * @param  {(string|Object)} options.interface.destination - Service specific identified (eg. Twitch channel name)
 * @param  {Object} options.interface.options - Command instance configuration
 */
function registerCommand(options) {
	if(commandRefs[options.command]) {
		if(options.reload === undefined || options.reload === null) {
			options.reload = false;
		}
		if(options.reload) {
			var instanceCache = commandRefs[options.command].instances;
			delete require.cache[path.resolve('./commands/' + options.command + '.js')];
			commandRefs[options.command] = new require('./commands/' + options.command + '/index.js');
			for(var i = 0, l = instanceCache.length; i < l; ++i) {
				if(instanceCache[i] !== options.interface) {
					commandRefs[options.command].addInstance(instanceCache[i].destination, instanceCache[i].options);
				}
			}
		}
		commandRefs[options.command].addInstance(options.interface.destination, options.interface.options);
	}
}

/**
 * Takes message data as input, and returns string containing response
 * @param  {Object} options - Options & information about message.
 * @param  {Object[]} options.commands - Array of command options and reference information.
 * @param  {string} options.commands[].command - Folder name containing a commands index.js.
 * @param  {message} options.message - Message information in standard structure.
 * @param  {Function} callback - Callback to run when response created (response: string).
 */
function runCommand(options, callback) {
	for(var i = 0, l = options.commands.length; i < l; ++i) {
		var commandResponse = commandRefs[options.commands[i].command].runCommand(options.message);
		if(commandResponse) {
			callback(commandResponse);
			break;
		}
	}
}

function reload() {

}

isDebugging(function(err, res) {
	if(err) {
		console.log('Something went wrong trying to detect debug mode...');
	} else if(res) {
		var heapdump = require('heapdump');
		console.log('debug mode has been detected');
	}
});

function isDebugging(cb) {
	require('net').createServer().on('error', function(err) {
		if (err.code === 'EADDRINUSE')
			cb(null, true);
		else
			cb(err);
	}).listen(process.debugPort, function() {
		this.close();
		cb(null, false);
	});
}

new module.exports();

/**
 * @typedef message
 * @type {object}
 * @property {Object} interface - Object containing information about service message comes from.
 * @property {string} message - Message text.
 * @property {string} user - User who that sent message.
 * @property {string} channel - Location of message sent.
 * @property {number=} [timestamp] - Epoch/UNIX timestamp of message.
 * @property {number=} [role] - Integer value determining role level (as defined by roles module).
 */
