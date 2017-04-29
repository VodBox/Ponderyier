/**
 * Ponder Command Functions
 *
 * Generates random nonsense based on previous chat messages
 *
 * All the functions in this file should be essentially "pure"
 * Stateful functions should be done elsewhere
 */
const utils = require("../../engine/utils.js");
const getValueOrDefault = utils.getValueOrDefault;


exports.readConfig = readConfig;
exports.runCommand = runCommand;

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

	chatConfig.keywords = {
		lexicalMarker: lexicalMarker,
		ponder: ponderKeyword,
		count: countKeyword,
		help: helpKeyword
	};

	chatConfig.matchesPonder = (message) => message.startsWith(lexicalMarker + ponderKeyword + " ");
	chatConfig.ponderReplace = (message) => message.replace(lexicalMarker + ponderKeyword + " ", ""); //TODO: I don't like these closures, too hard to follow?
	chatConfig.matchesCount = (message) => message == (lexicalMarker + countKeyword);
	chatConfig.matchesHelp = (message) => message == (lexicalMarker + helpKeyword);
	return chatConfig;
}

/**
 * processes the message and decides which command is to be called
 *
 * @param {Object} tags - information about the incoming message
 * @param {Object} chatroomState - config object describing state in a chatroom
 * @returns response if one is generated, else undefined
 */
function runCommand(tags, chatroomState, megaHAL, badWords) {
	let message = tags.message;
	let user = tags.user;
	chatroomState.messagesLeft--;
	chatroomState.helpLeft--;
	chatroomState.countLeft--;
	if (chatroomState.matchesPonder(message)) {
		return runPonderCommand(chatroomState, user, message, megaHAL, badWords);
	} else if (chatroomState.matchesCount(message)) {
		return runCountCommand(chatroomState);
	} else if (chatroomState.matchesHelp(message)) {
		return runHelpCommand(chatroomState);
	} else if (message.startsWith("!load ") && user == "dillonea") {
		loadFromIrc(message.replace("!load ", ""));
		return "Loading from " + message.replace("!load ", "") + "...";
	}
	if (chatroomState.ignores.indexOf(user) < 0) {
		megaHAL.add(message);
	}
}

/**
 * runs the ponder command
 * @param {Object} chatroomState - information about the chatroomState
 * @param {String} user - username who sent the message
 * @param {String} message - the text of the message
 * @returns a message to be sent to the chat room
 */
function runPonderCommand(chatroomState, user, message, megaHAL, badWords) {
	let processedMessage = chatroomState.ponderReplace(message);
	if (chatroomState.unlimitedPonders.indexOf(user) > -1) {
		console.log(`${user} Has Unlimited Ponders`);
		return generatePonder(processedMessage, megaHAL, badWords);
	} else if (chatroomState.messagesLeft < 1) {
		chatroomState.messagesLeft = chatroomState.messageInterval; //reset messagesLeft to the interval
		return generatePonder(processedMessage, megaHAL, badWords);
	} else if (chatroomState.countLeft < 1) {
		let result = `There are ${Math.max(chatroomState.messagesLeft, 0)} messages left till the next !ponder`;
		chatroomState.countLeft = chatroomState.countInterval;
		return result;
	}
}

/**
 * runs the count command
 * @param {Object} chatroomState - information about the chatroomState
 * @returns a message to be sent to the chat room
 */
function runCountCommand(chatroomState) {
	if (chatroomState.countLeft < 1) {
		let result = `There are ${Math.max(chatroomState.messagesLeft, 0)} messages left till the next !ponder`;
		chatroomState.countLeft = chatroomState.countInterval;
		return result;
	}
}

/**
 * runs the help command
 * @param {Object} chatroomState - information about the chatroomState
 * @returns a message to be sent to the chat room
 */
function runHelpCommand(chatroomState) {
	if (chatroomState.helpLeft < 1) {
		chatroomState.helpLeft = chatroomState.helpInterval;
		return `A !ponder will be available every ${chatroomState.messageInterval} messages, and you have one ponder for your user every 24 hours.`;
	}
}

/**
 * Generate a new ponder, checking for forbidden words.
 *
 * This is meant to be tail recursive, and tail call optimisation is part of ES6 spec.
 * @param {String} processedMessage - Message excluding the command keyword
 * @param {Object} megaHAL - object that generates candidate sentences
 * @param {Object} badWords - array of disallowed words
 * @param {Number} remainingAttempts - number of tries left. Defaults to 30 if not specified.
 */
function generatePonder(processedMessage, megaHAL, badWords, remainingAttempts = 30) {
	if (remainingAttempts <= 0) {
		return "null";
	}
	let ponder = megaHAL.getReplyFromSentence(processedMessage);
	console.log("ponder = " + ponder);
	console.log("badWords = " + badWords);
	let badWordFound = badWords.some(badWord => ponder.includes(badWord));
	if (badWordFound) {
		return generatePonder(processedMessage, megaHAL, badWords, remainingAttempts - 1);
	} else {
		return ponder;
	}
}

/**
 * load from IRC
 * @param file -
 */
function loadFromIrc(file, megaHAL) {
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
