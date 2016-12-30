var hal = require('jsmegahal');
var zlib = require('zlib');
var fs = require('fs');

var lupus = require('lupus');

var users = {};

var messageStore = [];

var megaHAL;

module.exports = function() {
	console.log('YES. THINGS HAVE CHANGED');
	megaHAL = new hal(1);
	fs.readFile('./messages.zip', function(err, res) {
		if(err) {
			console.log(err);
		} else {
			zlib.unzip(res, function(error, buffer) {
				messageStore = buffer.toString().split('\n');
				for(var i = 0, l = messageStore.length; i < l; ++i) {
					this.megaHAL.add(messageStore[i]);
				}
			});
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
				console.log('here');
				if(users[tags["channel"]].unlimitedPonders.indexOf(tags["user"]) > -1) {
					return megaHAL.getReplyFromSentence(tags["message"].replace('/\!ponder /', ''));
				}else if(users[tags["channel"]].messagesLeft < 1) {
					users[tags["channel"]].messagesLeft = users[tags["channel"]].messageInterval;
					return megaHAL.getReplyFromSentence(tags["message"].replace('/\!ponder /', ''));
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
		
	};
	
	this.setOptions = function(options) {
		
	};
	
	this.exit = function() {
		
	};
	return this;
};
var chatLines;

function loadFromIrc(file) {
	fs.readFile('./' + file, 'utf8', function(error, response) {
		if(error) {
			console.log(error);
		} else {
			chatLines = response.match(/\d+\-\d+\:\d+\:\d+\<.(\S+)\>\s(.+)\n/g);
			lupus(0, chatLines.length, function(n) {
				megaHAL.add(chatLines[n].match(/\d+\-\d+\:\d+\:\d+\<.\S+\>\s(.+)\n/)[1]);
			});
		}
	});
}