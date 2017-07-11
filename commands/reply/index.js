/**
 * The Reply command allows users to add predefined replies to given commands
 */

var chats = {};
var replies = {};
var cooldowns = {};

module.exports = function() {
	this.addInstance = function(chat, config, _super, ignore, interface) {
		chats[chat] = config;
		replies[chat] = config.replies;
		cooldowns[chat] = {};
	};

	this.exists = true;

	this.runCommand = function(tags, _super) {
		let message = tags.message;
		let chat = tags.channel;
		if(message.startsWith("!") && (tags.mod == '1' || tags.user == chat)) {
			if(message.match(/^\!reply\s/i)) {
				if(message.match(/^\!reply\sadd/i)) {
					let keyAndValue = message.match(/^\!reply\sadd\s(--cooldown=(\d+)\s)?"(.+?)"\s(.+)$/i);
					if(!keyAndValue) {
						return "Command Failed - Syntax Error";
					} else if(replies[chat][keyAndValue[3]]) {
						return "Command Failed - Key Already Exists";
					}
					replies[chat][keyAndValue[3]] = {response: keyAndValue[4]};
					if(keyAndValue[2]) {
						replies[chat][keyAndValue[3]].cooldown = keyAndValue[2];
					} else {
						replies[chat][keyAndValue[3]].cooldown = 10;
					}
					return "Reply Added";
				} else if(message.match(/^\!reply\sedit/i)) {
					let keyAndValue = message.match(/^\!reply\sedit\s(--cooldown=(\d+)\s)?"(.+?)"\s(.+)$/i);
					let coolKeyAndValue = message.match(/^\!reply\sadd\s--cooldown=(\d+)\s"(.+?)"$/i);
					if(!keyAndValue && !coolKeyAndValue) {
						return "Command Failed - Syntax Error";
					} else if(keyAndValue && replies[chat][keyAndValue[3]]) {
						replies[chat][keyAndValue[3]].response = keyAndValue[4];
						if(keyAndValue[2]) {
							replies[chat][keyAndValue[3]].cooldown = keyAndValue[2];
						}
						return "Reply Edited";
					} else if(coolKeyAndValue && replies[chat][coolKeyAndValue[2]]) {
						replies[chat][coolKeyAndValue[2]].cooldown = coolKeyAndValue[1];
						return "Reply Edited";
					}
					return "Command Failed - Key Doesn't Exist";
				} else if(message.match(/^\!reply\sremove/i)) {
					let key = message.match(/^\!reply\sremove\s"(.+?)$/i);
					if(!key) {
						return "Command Failed - Syntax Error";
					} else if(replies[chat][key[1]]) {
						delete replies[chat][key[1]];
						return "Reply Removed";
					}
					return "Command Failed - Key Doesn't Exist";
				}
				return "Command Failed - Syntax Error";
			}
		} else if(!message.startsWith("!")){
			let keys = Object.keys(replies[chat]);
			for(var i = 0, l = keys.length; i < l; ++i) {
				if(!cooldowns[chat][keys[i]]) {
					cooldowns[chat][keys[i]] = 0;
				}
				if(message.toLowerCase().includes(keys[i].toLowerCase())
					&& cooldowns[chat][keys[i]] < 1) {
					cooldowns[chat][keys[i]] = replies[chat][keys[i]].cooldown;
					return replies[chat][keys[i]].response;
				}
				cooldowns[chat][keys[i]]--;
			}
		}
	};

	this.pullOptions = function() {
		return {
			chats: chats,
			replies: replies
		};
	};

	this.setOptions = function(options) {
		chats = options.chats;
		replies = options.replies;
	};

	this.exit = function() {
		return true;
	};
	return this;
};
