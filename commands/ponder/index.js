/**Ponder Command */
var hal = require('jsmegahal');
var zlib = require('zlib');
var fs = require('fs');

var lupus = require('lupus');

var users = {};

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

	/**
	 * pulls options from the command
	 * @returns
	 */
	this.pullOptions = () => {
		return {
			"hal": megaHAL
		};
	};

	/**
	 * sets options of the command
	 * @param options - the options to set on the command
	 */
	this.setOptions = (options) => {
		megaHAL = options.hal;
	};

	//TODO: fill out JSDoc - wongjoel 2017-03-20
	/**
	 * exit
	 */
	this.exit = () => {
		return true;
	};
	return this;
};

//TODO: fill out JSDoc - wongjoel 2017-03-20
/**
 * Initial setup
 * @param  {Object} user -
 * @param  {Object} config -
 */
function addInstance(user, config) {
	console.log("add instance: " + user);
	console.log("add instance config: ");
	console.log(config);
	console.log("users before: ");
	console.log(users);
	let inputUser = {};
	if(config.unlimitedPonders) {
		inputUser.unlimitedPonders = config.unlimitedPonders;
	} else {
		inputUser.unlimitedPonders = [];
	}
	if(config.resetTime) {
		inputUser.resetTime = config.resetTime;
	} else {
		inputUser.resetTime = 1600; // GMT
	}
	if(config.messageInterval) {
		inputUser.messageInterval = config.messageInterval;
	} else {
		inputUser.messageInterval = 30;
	}
	if(config.helpInterval) {
		inputUser.helpInterval = config.helpInterval;
	} else {
		inputUser.helpInterval = 15;
	}
	if(config.countInterval) {
		inputUser.countInterval = config.countInterval;
	} else {
		inputUser.countInterval = 10;
	}
	if(config.ignores) {
		inputUser.ignores = config.ignores;
	} else {
		inputUser.ignores = [];
	}

	inputUser.messagesLeft = 0;
	inputUser.helpLeft = 0;
	inputUser.countLeft = 0;

	users[user] = inputUser;

	console.log("users after: ");
	console.log(users);
};


//TODO: fill out JSDoc - wongjoel 2017-03-20
//TODO: parameterise !phelp response with messageInterval? - wongjoel 2017-03-20
/**
 * runs the command
 * @param  {Object} tags -
 * @returns
 */
function runCommand(tags) {
	let channel = tags.channel;
	let message = tags.message;
	if(users[tags.channel]) {
		users[tags.channel].messagesLeft--;
		users[tags.channel].helpLeft--;
		users[tags.channel].countLeft--;
		let result;
		if(tags.message.startsWith('!ponder ')) {
			if(users[tags.channel].unlimitedPonders.indexOf(tags.user) > -1) {
				console.log('Unlimited Ponders');
				return generatePonder(tags.message);
			} else if(users[tags.channel].messagesLeft < 1) {
				users[tags.channel].messagesLeft = users[tags.channel].messageInterval;
				return generatePonder(tags.message);
			} else if(users[tags.channel].countLeft < 1) {
				result =  "There are " + Math.max(users[tags.channel].messagesLeft, 0) + " messages left till the next !ponder";
				users[tags.channel].countLeft = users[tags.channel].countInterval;
				return result;
			}
		} else if(tags.message == "!pcount") {
			if(users[tags.channel].countLeft < 1) {
				result =  "There are " + Math.max(users[tags.channel].messagesLeft, 0) + " messages left till the next !ponder";
				users[tags.channel].countLeft = users[tags.channel].countInterval;
				return result;
			}
		} else if(tags.message == "!phelp") {
			if(users[tags.channel].helpLeft < 1) {
				users[tags.channel].helpLeft = users[tags.channel].helpInterval;
				return "A !ponder will be available every 30 messages, and you have one ponder for your user every 24 hours.";
			}
		} else if(tags.message.startsWith("!load ") && tags.user == "dillonea") {
			loadFromIrc(tags.message.replace("!load ", ""));
			return "Loading from " + tags.message.replace("!load ", "") + "...";
		}

		if(users[tags.channel].ignores.indexOf(tags.user) < 0) {
			megaHAL.add(tags.message);
		}
	}
};

/**
 * load from IRC
 * @param file -
 */
function generatePonder(message) {
	var valid = false;
	var attempts = 0;
	var ponder;
	while(!valid) {
		ponder = megaHAL.getReplyFromSentence(message.replace('/\!ponder /', ''));
		console.log(ponder);
		valid = true;
		for(var i = 0, l = badWords.length; i < l; ++i) {
			if(ponder.includes(badWords[i])) {
				valid = false;
			}
		}
		attempts++;
		if(attempts >= 30) {
			valid = true;
			ponder = "null";
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
				addLine = chatLines[n].match(/\d+\-\d+\:\d+\:\d+<.\S+>\s(.+)\n/)[1];
				megaHAL.add(addLine);
			});
		}
	});
}
