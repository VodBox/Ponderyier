/**Ponder Command */
const hal = require('jsmegahal');
const zlib = require('zlib');
const fs = require('fs');

const lupus = require('lupus');

var chatRooms = {};

var messageStore = [];

var badWords = [];

var megaHAL;
var chatLines;

module.exports = function() {
	megaHAL = new hal(1);

	fs.readFile('./badWords.txt', 'utf8', function(error, response) {
		if(error) {
			console.log(error);
		} else {
			badWords = response.split('\n');
		}
	});
	this.addInstance = addInstance;
	this.runCommand = runCommand;
	this.pullOptions = pullOptions;
	this.setOptions = setOptions;
	this.exit = exit;
	return this;
};

/**
 * pulls options from the command
 * @returns options
 */
function pullOptions() {
	return {
		"hal": megaHAL
	};
}

/**
 * sets options of the command
 * @param options - the options to set on the command
 */
function setOptions(options) {
	megaHAL = options.hal;
}

/**
 * exit
 */
function exit() {
	return true;
}

/**
 * Initial setup
 * @param  {Object} user - name of chat room
 * @param  {Object} config - config file
 */
function addInstance(user, config) {
	chatRooms[user] = readConfig(config);
}

/**
 * return a complete config object, replacing any missing values with defaults
 * @param  {Object} config - config file
 */
function readConfig(config) {
    let chatConfig = {};
    chatConfig.unlimitedPonders = getValueOrDefault(config.unlimitedPonders, []);
    chatConfig.resetTime = getValueOrDefault(config.resetTime, 1600); // GMT
    chatConfig.messageInterval = getValueOrDefault(config.messageInterval, 30);
    chatConfig.helpInterval = getValueOrDefault(config.helpInterval, 15);
    chatConfig.countInterval = getValueOrDefault(config.countInterval, 10);
    chatConfig.ignores = getValueOrDefault(config.ignores, []);
    chatConfig.messagesLeft = 0;
    chatConfig.helpLeft = 0;
    chatConfig.countLeft = 0;
    return chatConfig;
}

/**
 * Returns the value if present, else retuns the default value.
 * 
 * @param {*} value the value to return if present
 * @param {*} defaultValue the to return if absent
 */
function getValueOrDefault(value, defaultValue) {
    if(typeof value !== 'undefined') {
        return value;
    } else {
        return defaultValue;
    }
}

/**
 * processes the message and decides which command is to be called
 * 
 * @param  {Object} tags - information about the incoming message
 * @returns
 */
function runCommand(tags) {
	let message = tags.message;
	let user = tags.user;
	let channel = chatRooms[tags.channel];
	if(channel) {
		channel.messagesLeft--;
		channel.helpLeft--;
		channel.countLeft--;
		let result;
		if(message.startsWith('!ponder ')) {
			return runPonderCommand(channel, user, message);
		} else if(message == "!pcount") {
			return runCountCommand(channel);
		} else if(message == "!phelp") {
			return runHelpCommand(channel);
		} else if(message.startsWith("!load ") && user == "dillonea") {
			loadFromIrc(message.replace("!load ", ""));
			return "Loading from " + message.replace("!load ", "") + "...";
		}

		if(channel.ignores.indexOf(user) < 0) {
			megaHAL.add(message);
		}
	}
}

/**
 * runs the ponder command
 * @param  {Object} channel - information about the channel
 * @param  {String} user - username who sent the message
 * @param  {String} message - the text of the message
 * @returns a message to be sent to the chat room
 */
function runPonderCommand(channel, user, message) {
	if(channel.unlimitedPonders.indexOf(user) > -1) {
		console.log(user + ' Has Unlimited Ponders');
		return generatePonder(message);
	} else if(channel.messagesLeft < 1) {
		channel.messagesLeft = channel.messageInterval; //reset messagesLeft to the interval
		return generatePonder(message);
	} else if(channel.countLeft < 1) {
		let result =  "There are " + Math.max(channel.messagesLeft, 0) + " messages left till the next !ponder";
		channel.countLeft = channel.countInterval;
		return result;
	}
}

/**
 * runs the count command
 * @param  {Object} channel - information about the channel
 * @returns a message to be sent to the chat room
 */
function runCountCommand(channel) {
	if(channel.countLeft < 1) {
		let result =  "There are " + Math.max(channel.messagesLeft, 0) + " messages left till the next !ponder";
		channel.countLeft = channel.countInterval;
		return result;
	}
}

/**
 * runs the help command
 * @param  {Object} channel - information about the channel
 * @returns a message to be sent to the chat room
 */
function runHelpCommand(channel) {
	if(channel.helpLeft < 1) {
		channel.helpLeft = channel.helpInterval;
		return "A !ponder will be available every 30 messages, and you have one ponder for your user every 24 hours.";
	}
}

/**
 * generate a new ponder
 * @param file -
 */
function generatePonder(message) {
	let badWordFound = true;
	let attempts = 0;
	let ponder;
	while(badWordFound) {
		ponder = megaHAL.getReplyFromSentence(message.replace('/\!ponder /', ''));
		let badWord = badWords.find(badWord => ponder.includes(badWord));
		badWordFound = badWord ? true : false;
		attempts++;
		if(attempts >= 30) {
			return 'null';
		}
	}
	return ponder;
}

/**
 * load from IRC
 * @param file -
 */
function loadFromIrc(file) {
	fs.readFile('./' + file, 'utf8', function(error, response) {
		if(error) {
			console.log(error);
		} else {
			chatLines = response.match(/\d+\-\d+\:\d+\:\d+<.(\S+)>\s(.+)\n/g);
			lupus(0, chatLines.length, function(n) {
				let addLine = chatLines[n].match(/\d+\-\d+\:\d+\:\d+<.\S+>\s(.+)\n/)[1];
				megaHAL.add(addLine);
			});
		}
	});
}
