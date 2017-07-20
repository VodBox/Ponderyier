/**Timer Command */
var chats = {}; // This can theoretically change
var timers = {}; // This can theoretically change

const uuid = require('uuid/v1');

module.exports = function() {
	this.addInstance = function(chat, config, _super, ignore, interface) {
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
				"messagesSinceTimerStart": 0, // Will be changed programatically
				"interface": interface
			};
			runTimer(chat, config.timers[i].uuid, _super, interface);
		}
	};

	this.exists = true;
	this.instances = chats;

	this.runCommand = function(tags, _super) {
		let chat = tags.channel;
		let message = tags.message;
		if(chats[chat]) {
			for(let timer in chats[chat].timers) {
				chats[chat].timers[timer].messagesSinceTimerStart++;
			}
			if(tags.mod == '1' || tags.user == chat) {
				let response = "";
				if(message.match(/^\!timer\sadd\s(\S+)\s(.+)$/i)) {
					let timerOptions = {};
					timerOptions.uuid = uuid();
					timerOptions.name = message.match(/^\!timer\sadd\s(\S+)\s(.+)$/i)[1];
					timerOptions.timeCooldown = (15 * 60);
					timerOptions.messageCooldown = 12;
					timerOptions.messagesSinceTimerStart = 0;
					let theRest = message.match(/^\!timer\sadd\s(\S+)\s(.+)$/i)[2];
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
					runTimer(chat, timerOptions.uuid, _super, tags.interface.name);
					response = "Timer added - uuid:" + timerOptions.uuid;
				} else if(message.match(/^\!timer\sdel\s(\S+)$/i)) {
					let deletes = [];
					let match = message.match(/^\!timer\sdel\s(\S+)$/i);
					if(match[1].startsWith("uuid:")) {
						for(let timer in timers) {
							if(timer == match[1].replace(/^uuid\:/, "")) {
								clearInterval(timers[timer]);
								delete timers[timer];
								delete chats[chat].timers[timer];
								response = "Timer deleted.";
							}
						}
						if(response === "") {
							response = "No timer found with that uuid.";
						}
					} else {
						for(let timer in timers) {
							if(match[1] == chats[chat].timers[timer].name) {
								deletes[deletes.length] = timer;
							}
						}
						if(deletes.length == 1) {
							clearInterval(timers[deletes[0]])
							delete timers[deletes[0]];
							delete chats[chat].timers[deletes[0]];
							response = "Timer deleted.";
						} else if(deletes.length > 1) {
							response = "Multiple timers with that name. Please specify uuid.";
						} else {
							response = "No timer found with that name.";
						}
					}
				}
				if(response !== "") {
					return response;
				}
			}
			chats[chat].lastMessageTime = Math.floor(Date.now() / 1000);
		}
	};

	this.pullOptions = function() {
		return {
			chats: chats
		};
	};

	this.setOptions = function(options) {
		clearTimers();
		if(options.chats) {
			chats = options.chats;
			for(let chat in chats) {
				for(let i = 0, l = chats[chat].timers.length; i < l; ++i) {
					runTimer(chat, chats[chat].timers[i].uuid, _super, chats[chat].timers[i].interface);
				}
			}
		}
	};

	this.exit = function() {
		clearTimers();
	};
	return this;
};

function clearTimers() {
	for(let timer in timers) {
		clearInterval(timers[timer]);
		timers = {};
	}
}

function runTimer(chat, uuid, _super, interface) {
	timers[uuid] = setInterval(function() {
		if(chats[chat].timers[uuid].messagesSinceTimerStart >= chats[chat].timers[uuid].messageCooldown) {
			_super.interfaces[interface].sendMessage(chat, chats[chat].timers[uuid].message);
			chats[chat].timers[uuid].messagesSinceTimerStart = 0;
		}
	}, chats[chat].timers[uuid].timeCooldown * 1000);
}
