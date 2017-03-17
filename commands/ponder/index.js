var hal = require('jsmegahal');
var zlib = require('zlib');
var fs = require('fs');

var lupus = require('lupus');

var users = {};

var messageStore = [];

var badWords = [];

var megaHAL;

module.exports = function() {
	megaHAL = new hal(1);

	fs.readFile('./badWords.txt', 'utf8', function(error, response) {
		if(error) {
			console.log(error);
		} else {
			badWords = response.split('\n');
		}
	});

	this.addInstance = function(user, config) {
		users[user] = {};
		if(config["unlimitedPonders"]) {
			users[user].unlimitedPonders = config["unlimitedPonders"];
		} else {
			users[user].unlimitedPonders = [];
		}
		if(config["resetTime"]) {
			users[user].resetTime = config["resetTime"];
		} else {
			users[user].resetTime = 1600; // GMT
		}
		if(config["messageInterval"]) {
			users[user].messageInterval = config["messageInterval"];
		} else {
			users[user].messageInterval = 30;
		}
		if(config["helpInterval"]) {
			users[user].helpInterval = config["helpInterval"];
		} else {
			users[user].helpInterval = 15;
		}
		if(config["countInterval"]) {
			users[user].countInterval = config["countInterval"];
		} else {
			users[user].countInterval = 10;
		}
		if(config["ignores"]) {
			users[user].ignores = config["ignores"];
		} else {
			users[user].ignores = [];
		}

		users[user].messagesLeft = 0;
		users[user].helpLeft = 0;
		users[user].countLeft = 0;
	};

	this.runCommand = function(tags) {
		if(users[tags["channel"]]) {
			users[tags["channel"]].messagesLeft--;
			users[tags["channel"]].helpLeft--;
			users[tags["channel"]].countLeft--;
			if(tags["message"].startsWith('!ponder ')) {
				if(users[tags["channel"]].unlimitedPonders.indexOf(tags["user"]) > -1) {
					console.log('Unlimited Ponders');
					var valid = false;
					var attempts = 0;
					var ponder;
					while(!valid) {
						ponder = megaHAL.getReplyFromSentence(tags["message"].replace('/\!ponder /', ''));
						valid = true;
						for(var i = 0, l = badWords.length; i < l; ++i) {
							if(ponder.includes(badWords[i])) {
								valid = false;
							}
						}
						attempts++;
						if(attempts == 30) {
							valid = true;
							ponder = "null";
						}
					}
					return ponder;
				} else if(users[tags["channel"]].messagesLeft < 1) {
					users[tags["channel"]].messagesLeft = users[tags["channel"]].messageInterval;
					var valid = false;
					var attempts = 0;
					var ponder;
					while(!valid) {
						ponder = megaHAL.getReplyFromSentence(tags["message"].replace('/\!ponder /', ''));
						valid = true;
						for(var i = 0, l = badWords.length; i < l; ++i) {
							if(ponder.includes(badWords[i])) {
								valid = false;
							}
						}
						attempts++;
						if(attempts == 30) {
							valid = true;
							ponder = "null";
						}
					}
					return ponder;
				} else if(users[tags["channel"]].countLeft < 1) {
					var result =  "There are " + Math.max(users[tags["channel"]].messagesLeft, 0) + " messages left till the next !ponder";
					users[tags["channel"]].countLeft = users[tags["channel"]].countInterval;
					return result;
				}
			} else if(tags["message"] == "!pcount") {
				if(users[tags["channel"]].countLeft < 1) {
					var result =  "There are " + Math.max(users[tags["channel"]].messagesLeft, 0) + " messages left till the next !ponder";
					users[tags["channel"]].countLeft = users[tags["channel"]].countInterval;
					return result;
				}
			} else if(tags["message"] == "!phelp") {
				if(users[tags["channel"]].helpLeft < 1) {
					users[tags["channel"]].helpLeft = users[tags["channel"]].helpInterval;
					return "A !ponder will be available every 30 messages, and you have one ponder for your user every 24 hours.";
				}
			} else if(tags["message"].startsWith("!load ") && tags["user"] == "dillonea") {
				loadFromIrc(tags["message"].replace("!load ", ""));
				return "Loading from " + tags["message"].replace("!load ", "") + "...";
			}

			if(users[tags["channel"]].ignores.indexOf(tags["user"]) < 0) {
				megaHAL.add(tags["message"]);
			}
		}
	};

	this.pullOptions = function() {
		return {
			"hal": megaHAL
		};
	};

	this.setOptions = function(options) {
		megaHAL = options["hal"];
	};

	this.exit = function() {
		return true;
	};
	return this;
};
var chatLines;

function loadFromIrc(file) {
	debugger;
	fs.readFile('./' + file, 'utf8', function(error, response) {
		if(error) {
			console.log(error);
		} else {
			chatLines = response.match(/\d+\-\d+\:\d+\:\d+\<.(\S+)\>\s(.+)\n/g);
			lupus(0, chatLines.length, function(n) {
				addLine = chatLines[n].match(/\d+\-\d+\:\d+\:\d+\<.\S+\>\s(.+)\n/)[1];
				megaHAL.add(addLine);
			});
		}
	});
}
