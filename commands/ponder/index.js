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
 * runs the command
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
			if(channel.unlimitedPonders.indexOf(user) > -1) {
				console.log(user + 'Has Unlimited Ponders');
				return generatePonder(message);
			} else if(channel.messagesLeft < 1) {
				channel.messagesLeft = channel.messageInterval;
				return generatePonder(message);
			} else if(channel.countLeft < 1) {
				result =  "There are " + Math.max(channel.messagesLeft, 0) + " messages left till the next !ponder";
				channel.countLeft = channel.countInterval;
				return result;
			}
		} else if(message == "!pcount") {
			if(channel.countLeft < 1) {
				result =  "There are " + Math.max(channel.messagesLeft, 0) + " messages left till the next !ponder";
				channel.countLeft = channel.countInterval;
				return result;
			}
		} else if(message == "!phelp") {
			if(channel.helpLeft < 1) {
				channel.helpLeft = channel.helpInterval;
				return "A !ponder will be available every 30 messages, and you have one ponder for your user every 24 hours.";
			}
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
