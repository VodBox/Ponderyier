/**
 * Moderation Command
 *
 * Enforces rule-based moderation
 */
const fs = require('fs');

var chats = {};
var badWords;

fs.readFile('./badWords.txt', 'utf8', function (error, response) {
	if (error) {
		console.error(new Error(`No badword.txt file in the root dir\n ${error}`));
	} else {
		badWords = response.split('\n');
	}
});

module.exports = function () {
	this.addInstance = addInstance;
	this.runCommand = runCommand;
	this.pullOptions = pullOptions;
	this.setOptions = setOptions;
	this.exit = exit;
	return this;
};

/**
 * Initial setup
 * @param  {Object} chatRoom - name of chat room
 * @param  {Object} config - config object
 */
function addInstance(chatRoom, config) {
	console.log(chatRoom);
	chats[chatRoom] = readConfig(config);
}

/**
 * processes the message and decides which command is to be called
 *
 * @param  {Object} tags - information about the incoming message
 * @param  {Object} manager -
 * @returns response if one is generated, else undefined
 */
function runCommand(tags, manager) {
	let chat = tags.channel;
	let chatConfig = chats[chat];
	let message = tags.message;
	let user = tags.user;
	let takeAction = false;
	let reason;
	// console.log(tags);
	if (tags.mod == 1 || user == chat) {
		return;
	}
	if (!chatConfig.users[user]) {
		chatConfig.users[user] = {
			"level": 0,
			"lastAction": 0,
			"lastMessages": Array.apply(null, Array(chatConfig.spamTolerance)).map(Number.prototype.valueOf, 0)
		};
	}
	if (chatConfig.badWords) {
		let badWord = badWords.find(badWord => message.toLowerCase().includes(badWord));
		if (badWord) {
			takeAction = true;
			reason = "Watch your language!";
		} else {
			let badWord = chatConfig.customBadWords.find(badWord => message.toLowerCase().includes(badWord));
			if (badWord) {
				takeAction = true;
				reason = "Watch your language!";
			}
		}
	}
	if (!takeAction && chatConfig.emotes) {
		let emotes = tags.emotes.match(/\d+-\d+/g);
		if (emotes && emotes.length > chatConfig.emoteTolerance) {
			takeAction = true;
			reason = "Stop spamming emotes!";
		}
	}
	if (!takeAction && chatConfig.caps && message.length > 9) {
		let uppercase = message.match(/[A-Z]/g) || { "length": 0 };
		let lowercase = message.match(/[a-z]/g) || { "length": 0 };
		let numbers = message.match(/\d/g) || { "length": 0 };
		if (uppercase.length > (uppercase.length + lowercase.length + (numbers.length * 0.5)) * chatConfig.capsProportion) {
			takeAction = true;
			reason = "Watch your caps!";
		}
	}
	if (!takeAction && chatConfig.symbols && message.length > 9) {
		let symbols = message.match(/[^a-zA-Z0-9\s]/g) || { "length": 0 };
		let numbers = message.match(/\d/g) || { "length": 0 };
		let letters = message.match(/[a-zA-Z]/g) || { "length": 0 };
		if (symbols.length > (symbols.length + (numbers.length * 0.5) + letters.length) * chatConfig.symbolProportion) {
			takeAction = true;
			reason = "Please stop spamming symbols!";
		}
	}
	if (!takeAction && chatConfig.spam && message.length > 9) {
		let tolerance = Date.now() - 1000;
		let count = 1;
		for (var i = 0, l = chatConfig.spamTolerance; i < l; ++i) {
			if (chatConfig.users[user].lastMessages[i] > tolerance) {
				++count;
			}
		}
		if (count > chatConfig.spamTolerance) {
			takeAction = true;
			reason = "Please stop spamming chat!";
		}
	}
	if (takeAction) {
		if (chatConfig.users[user].lastAction < Date.now() - (60 * 60 * 1000) || chatConfig.users[user].level === 0) {
			chatConfig.users[user].level = 1;
			chatConfig.users[user].lastAction = Date.now();
			manager.interfaces[tags.interface.name].purgeUser(chat, user);
			if (chatConfig.verboseChat) {
				manager.interfaces[tags.interface.name].sendMessage(chat, "[WARNING] " + reason);
			}
		} else if (chatConfig.users[user].level == 1) {
			chatConfig.users[user].level = 2;
			chatConfig.users[user].lastAction = Date.now();
			manager.interfaces[tags.interface.name].kickUser(chat, user);
			if (chatConfig.verboseChat) {
				manager.interfaces[tags.interface.name].sendMessage(chat, "[WARNING] " + reason);
			}
		} else {
			manager.interfaces[tags.interface.name].banUser(chat, user);
			if (chatConfig.verboseChat) {
				manager.interfaces[tags.interface.name].sendMessage(chat, "[BAN] " + reason);
			}
		}
	}
	chatConfig.users[user].lastMessages.shift();
	chatConfig.users[user].lastMessages.push(Date.now());
}

/**
 * pulls options from the command
 * @returns options
 */
function pullOptions() {
	return null;
}

/**
 * sets options of the command
 * @param options - the options to set on the command
 */
function setOptions(options) {

}


/**
 * exit
 */
function exit() {
	return true;
}

/**
 * return a complete config object, replacing any missing values with defaults
 * @param  {Object} config - config object
 */
function readConfig(config) {
	let chatConfig = {};
	chatConfig.symbols = getValueOrDefault(config.symbols, true);
	chatConfig.caps = getValueOrDefault(config.caps, true);
	chatConfig.emotes = getValueOrDefault(config.emotes, true);
	chatConfig.badWords = getValueOrDefault(config.badWords, true);
	chatConfig.spam = getValueOrDefault(config.spam, true);
	chatConfig.symbolProportion = getValueOrDefault(config.symbolProportion, 0.5);
	chatConfig.capsProportion = getValueOrDefault(config.capsProportion, 0.8);
	chatConfig.emoteTolerance = getValueOrDefault(config.emoteTolerance, 5);
	chatConfig.customBadWords = getValueOrDefault(config.customBadWords, []);
	chatConfig.spamTolerance = getValueOrDefault(config.spamTolerance, 3); // per second
	chatConfig.verboseChat = getValueOrDefault(config.verboseChat, true);
	// Not read from config
	chatConfig.users = {};
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
