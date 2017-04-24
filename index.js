/** Entry point into Ponderyier */
const fs = require('fs');
const path = require('path');

const interfaces = {}; //object holding interface references.
const commandRefs = {}; //object holding command references
const savedOptions = {}; //object holding saved options

var self;

module.exports = function() {
	this.registerCommand = registerCommand;
	this.runCommand = runCommand;
	this.reload = reload;
	this.interfaces = interfaces;
	self = this;
	start(this);
};

/**
 * Wraps a callback API in a promise
 * @param {Object} funcToWrap - the function to wrap in a promise
 * @param {String} arg - the argument to pass to that function
 * @return a promise containing array of files, or an error
 */
function wrapInPromise(funcToWrap, arg) {
	return new Promise((resolve, reject) => {
		funcToWrap(arg, (error, files) => {
			if(error) {
				reject(new Error(error));
			} else {
				resolve(files);
			}
		});
	});
}

/**
 * Wraps fs.readdir in a promise
 * @param {String} directory
 * @return a promise containing array of files, or an error
 */
function readDirPromise(directory) {
	return wrapInPromise(fs.readdir, directory);
}

/**
 * Wraps fs.readFile in a promise
 * @param {String} file
 * @return a promise containing a file, or an error
 */
function readFilePromise(file) {
	return wrapInPromise(fs.readFile, file);
}

/**
 * Starts Pond delegation service
 * @param  {Object} self - The module.exports for the service
 */
function start(self) {
	readDirPromise('./commands/').then((commandFiles) => {
		console.log("here");
		commandFiles.forEach((commandFile) => {
			const isDir = fs.statSync('./commands/' + commandFile).isDirectory();
			if(isDir) {
				commandRefs[commandFile] = new (require('./commands/' + commandFile + '/index.js'))();
				if(commandRefs.ponder) {
					console.log('commandRefs.ponder.exists = ' + commandRefs.ponder.exists);
				}
				if(savedOptions && savedOptions[commandFile]) {
					commandRefs[commandFile].setOptions(savedOptions[commandFile]);
				}
			}
		});
	}).then(() => {
		return readFilePromise('./config.json');
	}).then((configFile) => {
		const parsedConfig = JSON.parse(configFile);
		for(let key in parsedConfig) {
			interfaces[key] = new require("./interfaces/" + key + "/main.js")(parsedConfig[key], self);
		}
	}).then(() => {
		return readDirPromise('./channels/');
	}).then((files) => {
		files.forEach((file) => {
			fs.readFile('./channels/' + file, function(err, response) {
				const config = JSON.parse(response);
				for(let key in config) {
					if(key != "channel") {
						interfaces[key].addChannel(config[key], self);
					}
				}
			});
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
					commandRefs[options.command].addInstance(instanceCache[i].destination, instanceCache[i].options, self, commandRefs[options.command], options.interface.name);
				}
			}
		} else {
			commandRefs[options.command].addInstance(options.interface.destination, options.interface.options, self, commandRefs[options.command], options.interface.name);
		}
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
		var commandResponse = commandRefs[options.commands[i].command].runCommand(options.message, self);
		if(commandResponse) {
			callback(commandResponse);
			break;
		}
	}
}

function reload() {
	console.log(new Error("reload not implemented"));
}

isDebugging(function(err, res) {
	if(err) {
		console.error(new Error('Something went wrong trying to detect debug mode...\n' + err));
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
