/**
 * index.js of logger command. Saves the messages passed in.
 */

let chats = [];

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
 * @param {Object} chat - name of chat room
 * @param {Object} config - config object
 * @param {Object} manager - manger
 */
function addInstance(chat, config, manager) {
	chats.push(chat);
}

/**
 * processes the message and decides what to do
 *
 * @param {Object} tags - information about the incoming message
 * @param {Object} manager - manager
 * @returns response if one is generated, else undefined
 */
function runCommand(tags, manager) {
	let chat = tags.channel;
	let message = tags.message;
	console.log("logger: " + message);
}

/**
 * returns the state of the command
 *
 * @returns state of the command
 */
function pullOptions() {
	return {
		chats: chats
	};
}

/**
 * sets the state of the command
 *
 * @param {Object} options - rstate
 */
function setOptions(options) {
	chats = options.chats;
}

/**
 * exit
 */
function exit() {
	return null;
}
