var chats = {};
var counters = {};

module.exports = function() {
	this.addInstance = function(chat, config, _super, ignore, interface) {
		chats[chat] = config;
		counters[chat] = config.counters;
	};

	this.exists = true;

	this.runCommand = function(tags, _super) {
		let message = tags.message;
		let chat = tags.channel;
		if(message.startsWith("!counter") && (tags.mod == '1' || tags.user == chat)) {
			if(message.match(/^\!counter\s/i)) {
				if(message.match(/^\!counter\sadd/i)) {
					let keyAndValue = message.match(/^\!counter\sadd\s(--mod=(1|0|true|false)\s)?([^-\s]\S*?)(\s(\d+))?$/i);
					if(!keyAndValue) {
						return "Command Failed - Syntax Error";
					} else if(counters[chat][keyAndValue[3]]) {
						return "Command Failed - Key Already Exists";
					}
					counters[chat][keyAndValue[3]] = {amount: (keyAndValue[5] ? parseInt(keyAndValue[5]) : 0)};
					if((keyAndValue[2] == "true" || keyAndValue[2] == "1") ||
							(chats[chat].modDefault &&
							!(keyAndValue[2] == "true" || keyAndValue[2] == "1"))) {
						counters[chat][keyAndValue[3]].mod = true;
					} else {
						counters[chat][keyAndValue[3]].mod = false;
					}
					return "Counter Added";
				} else if(message.match(/^\!counter\sremove/i)) {
					let key = message.match(/^\!counter\sremove\s(\S+?)$/i);
					if(!key) {
						return "Command Failed - Syntax Error";
					} else if(counters[chat][key[1]]) {
						delete counters[chat][key[1]];
						return "Counter Removed";
					}
					return "Command Failed - Key Doesn't Exist";
				}
				return "Command Failed - Syntax Error";
			}
		} else if(message.startsWith("!")){
			let keys = Object.keys(counters[chat]);
			for(var i = 0, l = keys.length; i < l; ++i) {
				if((!counters[chat][keys[i]].mod || tags.user == chat || tags.mod == 1)
					&& message.toLowerCase().startsWith("!" + keys[i].toLowerCase())) {
					let command = message.replace("!" + keys[i].toLowerCase(), "");
					if(command == "") {
						return keys[i] + " is " + counters[chat][keys[i]].amount;
					} else if(command.match(/^\s\+(\d+)$/)) {
						counters[chat][keys[i]].amount += parseInt(command.match(/^\s\+(\d+)$/)[1]);
						return keys[i] + " is now " + counters[chat][keys[i]].amount;
					} else if(command.match(/^\s\=(\d+)$/)) {
						let response = keys[i] + " went from " + counters[chat][keys[i]].amount + " to " + command.match(/^\s\=(\d+)$/)[1];
						counters[chat][keys[i]].amount = parseInt(command.match(/^\s\=(\d+)$/)[1]);
						return response;
					} else if(command.match(/^\s\-(\d+)$/)) {
						counters[chat][keys[i]].amount -= parseInt(command.match(/^\s\-(\d+)$/)[1]);
						return keys[i] + " is now " + counters[chat][keys[i]].amount;
					}
					return "Command Failed - Syntax Error";
				}
			}
		}
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
