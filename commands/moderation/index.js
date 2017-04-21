const fs = require('fs');

var chats = {};
var badWords;

fs.readFile('./badWords.txt', 'utf8', function(error, response) {
	if(error) {
		console.log(error);
	} else {
		badWords = response.split('\n');
	}
});

module.exports = function() {
	this.addInstance = function(chat, config, manager) {
		console.log(chat);
		chats[chat] = readConfig(config);
	};

	this.runCommand = function(tags, manager) {
		let chat = tags.channel;
		let message = tags.message;
		let user = tags.user;
		let takeAction = false;
		let reason;
		// console.log(tags);
		if(tags.mod == 1 || user == chat) {
			return;
		}
		if(!chats[chat].users[user]) {
			chats[chat].users[user] = {
				"level": 0,
				"lastAction": 0,
				"lastMessages": Array.apply(null, Array(chats[chat].spamTolerance)).map(Number.prototype.valueOf,0)
			};
		}
		if(chats[chat].badWords) {
			let badWord = badWords.find(badWord => message.toLowerCase().includes(badWord));
			if(badWord) {
				takeAction = true;
				reason = "Watch your language!";
			} else {
				let badWord = chats[chat].customBadWords.find(badWord => message.toLowerCase().includes(badWord));
				if(badWord) {
					takeAction = true;
					reason = "Watch your language!";
				}
			}
		}
		if(!takeAction && chats[chat].emotes) {
			let emotes = tags.emotes.match(/\d+-\d+/g);
			if(emotes && emotes.length > chats[chat].emoteTolerance) {
				takeAction = true;
				reason = "Stop spamming emotes!";
			}
		}
		if(!takeAction && chats[chat].caps && message.length > 9) {
			let uppercase = message.match(/[A-Z]/g) || {"length": 0};
			let lowercase = message.match(/[a-z]/g) || {"length": 0};
			let numbers = message.match(/\d/g) || {"length": 0};
			if(uppercase.length > (uppercase.length + lowercase.length + (numbers.length * 0.5)) * chats[chat].capsProportion) {
				takeAction = true;
				reason = "Watch your caps!";
			}
		}
		if(!takeAction && chats[chat].symbols && message.length > 9) {
			let symbols = message.match(/[^a-zA-Z0-9\s]/g) || {"length": 0};
			let numbers = message.match(/\d/g) || {"length": 0};
			let letters = message.match(/[a-zA-Z]/g) || {"length": 0};
			if(symbols.length > (symbols.length + (numbers.length * 0.5) + letters.length) * chats[chat].symbolProportion) {
				takeAction = true;
				reason = "Please stop spamming symbols!";
			}
		}
		if(!takeAction && chats[chat].spam && message.length > 9) {
			let tolerance = Date.now() - 1000;
			let count = 1;
			for(var i = 0, l = chats[chat].spamTolerance; i < l; ++i) {
				if(chats[chat].users[user].lastMessages[i] > tolerance) {
					++count;
				}
			}
			if(count > chats[chat].spamTolerance) {
				takeAction = true;
				reason = "Please stop spamming chat!";
			}
		}
		if(takeAction) {
			if(chats[chat].users[user].lastAction < Date.now() - (60 * 60 * 1000) || chats[chat].users[user].level === 0) {
				chats[chat].users[user].level = 1;
				chats[chat].users[user].lastAction = Date.now();
				manager.interfaces[tags.interface.name].purgeUser(chat, user);
				if(chats[chat].verboseChat) {
					manager.interfaces[tags.interface.name].sendMessage(chat, "[WARNING] " + reason);
				}
			} else if(chats[chat].users[user].level == 1) {
				chats[chat].users[user].level = 2;
				chats[chat].users[user].lastAction = Date.now();
				manager.interfaces[tags.interface.name].kickUser(chat, user);
				if(chats[chat].verboseChat) {
					manager.interfaces[tags.interface.name].sendMessage(chat, "[WARNING] " + reason);
				}
			} else {
				manager.interfaces[tags.interface.name].banUser(chat, user);
				if(chats[chat].verboseChat) {
					manager.interfaces[tags.interface.name].sendMessage(chat, "[BAN] " + reason);
				}
			}
		}
		chats[chat].users[user].lastMessages.shift();
		chats[chat].users[user].lastMessages.push(Date.now());
	};

	this.pullOptions = function() {
		return {
			chats: chats
		};
	};

	this.setOptions = function(options) {
		chats = options.chats;
	};

	this.exit = function() {
		return true;
	};
	return this;
};

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
		if(typeof value !== 'undefined') {
				return value;
		} else {
				return defaultValue;
		}
}
