/**
 * Ponder Command
 *
 * Generates random nonsense based on previous chat messages
 */
const hal = require('jsmegahal');
const zlib = require('zlib');
const fs = require('fs');

const lupus = require('lupus');

let chatRooms = {};

let messageStore = [];

let badWords = [];

let megaHAL;

module.exports = function () {
	megaHAL = new hal(1);

	fs.readFile('./badWords.txt', 'utf8', function (error, response) {
		if (error) {
			console.error(new Error(`No badword.txt file in the root dir\n ${error}`));
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
 * @param {Object} options - the options to set on the command
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
 * @param {Object} user - name of chat room
 * @param {Object} config - config object
 */
function addInstance(user, config) {
	chatRooms[user] = readConfig(config);
}

/**
 * return a complete config object, replacing any missing values with defaults
 * @param {Object} config - config object
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

	let lexicalMarker = getValueOrDefault(config.lexicalMarker, "!");
	let ponderKeyword = getValueOrDefault(config.ponderKeyword, "ponder");
	let countKeyword = getValueOrDefault(config.countKeyword, "pcount");
	let helpKeyword = getValueOrDefault(config.helpKeyword, "phelp");

	chatConfig.matchesPonder = (message) => message.startsWith(lexicalMarker + ponderKeyword + " ");
	chatConfig.ponderReplace = (message) => message.replace(lexicalMarker + ponderKeyword + " ", "");
	chatConfig.matchesCount = (message) => message == (lexicalMarker + countKeyword);
	chatConfig.matchesHelp = (message) => message == (lexicalMarker + helpKeyword);
	return chatConfig;
}

/**
 * Returns the value if present, else retuns the default value.
 *
 * @param {*} value the value to return if present
 * @param {*} defaultValue the to return if absent
 */
function getValueOrDefault(value, defaultValue) {
	if (typeof value !== 'undefined') {
		return value;
	} else {
		return defaultValue;
	}
}

/**
 * processes the message and decides which command is to be called
 *
 * @param {Object} tags - information about the incoming message
 * @returns response if one is generated, else undefined
 */
function runCommand(tags) {
	let message = tags.message;
	let user = tags.user;
	let channel = chatRooms[tags.channel];
	if (channel) {
		channel.messagesLeft--;
		channel.helpLeft--;
		channel.countLeft--;
		if (channel.matchesPonder(message)) {
			return runPonderCommand(channel, user, message);
		} else if (channel.matchesCount(message)) {
			return runCountCommand(channel);
		} else if (channel.matchesHelp(message)) {
			return runHelpCommand(channel);
		} else if (message.startsWith("!load ") && user == "dillonea") {
			loadFromIrc(message.replace("!load ", ""));
			return "Loading from " + message.replace("!load ", "") + "...";
		}

		if (channel.ignores.indexOf(user) < 0) {
			megaHAL.add(message);
		}
	}
}

/**
 * runs the ponder command
 * @param {Object} channel - information about the channel
 * @param {String} user - username who sent the message
 * @param {String} message - the text of the message
 * @returns a message to be sent to the chat room
 */
function runPonderCommand(channel, user, message) {
	let processedMessage = channel.ponderReplace(message);
	if (channel.unlimitedPonders.indexOf(user) > -1) {
		console.log(`${user} Has Unlimited Ponders`);
		return generatePonder(processedMessage);
	} else if (channel.messagesLeft < 1) {
		channel.messagesLeft = channel.messageInterval; //reset messagesLeft to the interval
		return generatePonder(processedMessage);
	} else if (channel.countLeft < 1) {
		let result = `There are ${Math.max(channel.messagesLeft, 0)} messages left till the next !ponder`;
		channel.countLeft = channel.countInterval;
		return result;
	}
}

/**
 * runs the count command
 * @param {Object} channel - information about the channel
 * @returns a message to be sent to the chat room
 */
function runCountCommand(channel) {
	if (channel.countLeft < 1) {
		let result = `There are ${Math.max(channel.messagesLeft, 0)} messages left till the next !ponder`;
		channel.countLeft = channel.countInterval;
		return result;
	}
}

/**
 * runs the help command
 * @param {Object} channel - information about the channel
 * @returns a message to be sent to the chat room
 */
function runHelpCommand(channel) {
	if (channel.helpLeft < 1) {
		channel.helpLeft = channel.helpInterval;
		return `A !ponder will be available every ${channel.messageInterval} messages, and you have one ponder for your user every 24 hours.`;
	}
}

/**
 * Generate a new ponder, checking for forbidden words.
 *
 * This is meant to be tail recursive, and tail call optimisation is part of ES6 spec.
 *
 * @param {String} processedMessage - Message excluding the command keyword
 * @param {Number} remainingAttempts - number of tries left. Defaults to 30 if not specified.
 */
function generatePonder(processedMessage, remainingAttempts = 30) {
	if (remainingAttempts <= 0) {
		return "null";
	}
	let ponder = megaHAL.getReplyFromSentence(processedMessage);
	let badWordFound = badWords.some(badWord => ponder.includes(badWord));
	if (badWordFound) {
		return generatePonder(processedMessage, remainingAttempts - 1);
	} else {
		return ponder;
	}
}

/**
 * load from IRC
 * @param file -
 */
function loadFromIrc(file) {
	fs.readFile(`./${file}`, 'utf8', function (error, response) {
		if (error) {
			console.log(new Error(error));
		} else {
			let chatLines = response.match(/\d+\-\d+\:\d+\:\d+<.(\S+)>\s(.+)\n/g);
			lupus(0, chatLines.length, function (n) {
				let addLine = chatLines[n].match(/\d+\-\d+\:\d+\:\d+<.\S+>\s(.+)\n/)[1];
				megaHAL.add(addLine);
			});
		}
	});
}
