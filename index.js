/** Entry point into Ponderyier */
const fs = require('fs');
const path = require('path');
const utils = require("./engine/utils.js");
const wrapInPromise = utils.wrapInPromise;

const interfaces = {}; //object holding interface references.
const commandRefs = {}; //object holding command references
const savedOptions = {}; //object holding saved options

const db = new (require("./engine/dbManager.js"))("main.json", function() {
	if(!db.getKey("users")) {
		db.createObject("users.json", function(res) {
			db.setKey("users", res);
		});
	}
});

var self;

module.exports = function () {
	this.registerCommand = registerCommand;
	this.runCommand = runCommand;
	this.reload = reload;
	this.interfaces = interfaces;
	this.db = db;
	self = this;
	start(this);
};

/**
 * Starts Pond delegation service
 * @param  {Object} self - The module.exports for the service
 */
function start(self) {
	Promise.resolve(console.log("Finding commands..."))
		.then(() => readCommands())
		.then(() => console.log("Finished reading Commands.\n"))
		.then(() => console.log("Reading config..."))
		.then(() => readConfig())
		.then(() => console.log("Finished reading Config\n"))
		.then(() => console.log("Adding channels..."))
		.then(() => readChannels())
		.then(() => console.log("Finished adding channels.\n"))
		.catch(error => {
			let message = error instanceof Error ? error : new Error(error);
			console.error(message);
			console.log("Shutting down...");
			process.exit();
		});
}

/**
 * Reads the commands from the file system
 * @return a promise chain that will read the commands
 */
function readCommands() {
	return wrapInPromise(fs.readdir, './commands/')
		.then(commandFiles => Promise.all(commandFiles
			.map(commandFile => wrapInPromise(fs.stat, './commands/' + commandFile)
				.then(isDir => {
					if (isDir) {
						console.log(`Found ${commandFile}`);
						const command = require(`./commands/${commandFile}/index.js`);
						commandRefs[commandFile] = new command();
						if (savedOptions && savedOptions[commandFile]) {
							commandRefs[commandFile].setOptions(savedOptions[commandFile]);
						}
					}
				}))));
}

/**
 * Reads the config from the file system
 * @return a promise chain that will read the config
 */
function readConfig() {
	return wrapInPromise(fs.readFile, './config.json')
		.then(configFile => {
			const parsedConfig = JSON.parse(configFile);
			for (let key in parsedConfig) {
				console.log(`Adding interface: ${key}`);
				const interface = require(`./interfaces/${key}/main.js`)
				interfaces[key] = new interface(parsedConfig[key], self);
			}
		});
}

/**
 * Reads the channels from the file system
 * @return a promise chain that will read the channels
 */
function readChannels() {
	return wrapInPromise(fs.readdir, './channels/')
		.then(channelFiles => Promise.all(channelFiles.map(file => wrapInPromise(fs.readFile, './channels/' + file)
			.then(channel => {
				const config = JSON.parse(channel);
				for (let key in config) {
					if (key != "channel") {
						console.log(`Connecting to channel ${config.channel} on interface ${key}`);
						interfaces[key].addChannel(config[key], self);
					}
				}
			}))));
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
	if (commandRefs[options.command]) {
		if (options.reload === undefined || options.reload === null) {
			options.reload = false;
		}
		if (options.reload) {
			let state = commandRefs[options.command].pullOptions();
			delete require.cache[require.resolve(`./commands/${options.command}/index.js`)];
			try {
				let newInstance = new (require(`./commands/${options.command}/index.js`))();
				newInstance.setOptions(state);
				commandRefs[options.command].exit();
				commandRefs[options.command] = newInstance;
			} catch(e) {
				console.log(e);
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
	for (var i = 0, l = options.commands.length; i < l; ++i) {
		var commandResponse = commandRefs[options.commands[i].command].runCommand(options.message, self);
		if (commandResponse) {
			callback(commandResponse);
			break;
		}
	}
}

function reload() {
	for(let key in commandRefs) {
		registerCommand({
			command: key,
			reload: true
		});
	}
}

isDebugging(function (err, res) {
	if (err) {
		console.error(new Error('Something went wrong trying to detect debug mode...\n' + err));
	} else if (res) {
		var heapdump = require('heapdump');
		console.log('debug mode has been detected');
	}
});

function isDebugging(cb) {
	require('net').createServer().on('error', function (err) {
		if (err.code === 'EADDRINUSE')
			cb(null, true);
		else
			cb(err);
	}).listen(process.debugPort, function () {
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
