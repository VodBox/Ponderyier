/**
 * index.js of logger command. Saves the messages passed in.
 */

var chats = [];

module.exports = function() {
	this.addInstance = function(chat, config, manager) {
		chats.push(chat);
	};

	this.runCommand = function(tags, manager) {
		let chat = tags.channel;
		let message = tags.message;
		console.log("logger: " + message);
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
