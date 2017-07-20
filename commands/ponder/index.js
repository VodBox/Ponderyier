/**
 * Ponder Command Public Interface and State management
 *
 * Generates random nonsense based on previous chat messages
 */
const hal = require('jsmegahal');
const fs = require('fs');
const ponder = require('./ponder.js');

let chatRooms = {};
let badWords = [];
let megaHAL;

module.exports = function () {
	megaHAL = new hal(1);

	fs.readFile('./badWords.txt', 'utf8', function (error, response) {
		if (error) {
			throw new Error(new Error(`No badword.txt file in the root dir\n ${error}`));
		} else {
			badWords = response.split('\n')
				.filter((line) => line); //this should remove blank lines
		}
	});
	this.addInstance = addInstance;
	this.runCommand = runCommand;
	this.pullOptions = pullOptions;
	this.setOptions = setOptions;
	this.instances = chatRooms;
	this.exit = exit;
	return this;
};

/**
 * Initial setup
 * @param {Object} user - name of chat room
 * @param {Object} config - config object describing state in a chatroom
 */
function addInstance(user, config) {
	chatRooms[user] = ponder.readConfig(config);
}

/**
 * processes the message and decides which command is to be called
 *
 * @param {Object} tags - information about the incoming message
 * @returns response if one is generated, else undefined
 */
function runCommand(tags) {
	let chatroomState = chatRooms[tags.channel];
	if (chatroomState) {
		return ponder.runCommand(tags, chatroomState, megaHAL, badWords);
	} else {
		console.warn(new Error("Unknown channel " + tags.channel));
	}
}

/**
 * pulls options from the command
 * @returns options
 */
function pullOptions() {
	return {
		"hal": megaHAL,
		"chats": chatRooms
	};
}

/**
 * sets options of the command
 * @param {Object} options - the options to set on the command
 */
function setOptions(options) {
	megaHAL = options.hal;
	chatRooms = options.chats;
}

/**
 * exit
 */
function exit() {
	return true;
}


