var chats = {}; // This can theoretically change
var timers = {}; // This can theoretically change

const uuid = require('uuid/v1');

module.exports = function() {
	this.addInstance = function(chat, config, _super) {
		chats[chat] = {
			"lastMessageTime": 0, // UNIX time
			"timers": {}
		};
		for(let i = 0, l = config.timers.length; i < l; ++i) {
			chats[chat].timers[config.timers[i].uuid] = {
				"message": config.timers[i].message,
				"name": config.timers[i].name,
				"timeCooldown": config.timers[i].timeCooldown,
				"messageCooldown": config.timers[i].messageCooldown,
				"messagesSinceTimerStart": 0 // Will be changed programatically
			};
			runTimer(chat, config.timers[i].uuid, _super);
		}
	};

	this.exists = true;

	this.runCommand = function(tags, _super) {
		let chat = tags.channel;
		let message = tags.message;
		if(chats[chat]) {
			for(let timer in chats[chat].timers) {
				chats[chat].timers[timer].messagesSinceTimerStart++;
			}
			if(tags.mod == '1' || tags.user == chat) {
				let response = "";
				if(message.match(/\!timer\sadd\s(\S+)\s(.+)$/i)) {
					let timerOptions = {};
					timerOptions.uuid = uuid();
					timerOptions.name = message.match(/\!timer\sadd\s(\S+)\s(.+)$/i)[1];
					timerOptions.timeCooldown = (15 * 60);
					timerOptions.messageCooldown = 12;
					timerOptions.messagesSinceTimerStart = 0;
					let theRest = message.match(/\!timer\sadd\s(\S+)\s(.+)$/i)[2];
					let justMessage = false;
					while(!justMessage) {
						if(theRest.match(/^\-\-(.+?)\=(.+?)\s/)) {
							timerOptions[theRest.match(/^\-\-(.+?)\=(.+?)\s/)[1]] = theRest.match(/^\-\-(.+?)\=(.+?)\s/)[2];
							theRest = theRest.split(/^\-\-.+?\=.+?\s(.+)/)[1];
						} else {
							timerOptions.message = theRest;
							justMessage = true;
						}
					}
					chats[chat].timers[timerOptions.uuid] = timerOptions;
					runTimer(chat, timerOptions.uuid, _super);
					response = "Timer added";
				}
				if(response != "") {
					return response;
				}
			}
			chats[chat].lastMessageTime = Math.floor(Date.now() / 1000);
		}
	};

	this.pullOptions = function() {
		return {
			chats: chats,
			timers: timers
		};
	};

	this.setOptions = function(options) {
		clearTimers();
		if(options.users) {
			chats = options.chats;
			timers = options.timers;
		}
	};

	this.exit = function() {
		return true;
	};
	return this;
};

function clearTimers() {

}

function runTimer(chat, uuid, _super) {
	timers[uuid] = setInterval(function() {
		_super.interfaces.twitch.sendMessage('dillonea', chats[chat].timers[uuid].message);
	}, chats[chat].timers[uuid].timeCooldown * 1000);
}
