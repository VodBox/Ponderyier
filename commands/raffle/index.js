var chats = {};
var entries = {};
var enabled = {};
var options = {};

module.exports = function() {
	this.addInstance = function(chat, config, _super, ignore, interface) {
		chats[chat] = config;
		console.log(config);
		entries[chat] = {};
	};

	this.exists = true;

	this.runCommand = function(tags, _super) {
		let message = tags.message;
		let chat = tags.channel;
		if(tags.user == chat) {
			if(message.match(/^!raffle(\s|$)/)) {
				enabled[chat] = !enabled[chat];
				if(enabled[chat]) {
					options[chat] = (chats[chat].default ? chats[chat].default : {});
					if(!message.match(/default/)) {
						if(message.match(/subs(\s|$|=(\d+))/)) {
							let match = message.match(/subs(\s|$|=(\d+))/);
							options[chat].subs = true;
							if(match[2]) {
								options[chat].subThresh = parseInt(match[2]);
							} else {
								options[chat].subThresh = 0;
							}
						} else {
							options[chat].subs = false;
						}
						if(message.match(/followers(\s|$|=(\d+))/)) {
							let match = message.match(/followers(\s|$|=(\d+))/);
							options[chat].followers = true;
							if(match[2]) {
								options[chat].folThresh = parseInt(match[2]);
							} else {
								options[chat].folThresh = 0;
							}
						} else {
							options[chat].followers = false;
						}
						if(!options[chat].sub && !options[chat].followers) {
							options[chat].everyone = true;
						}
					}
					entries[chat] = {};
				}
				return "Raffle " + (enabled[chat] ? "enabled." : "disabled.");
			} else if(message.match(/^\!rwinner$/)) {
				console.log(entries[chat]);
				let winner = entries[chat][Object.keys(entries[chat])[Math.floor(Math.random() * Object.keys(entries[chat]).length)]];
				return "@" + winner + " won the raffle!";
			}
		} else if(enabled[chat] && message.match(/^!enter$/)){
			if(options[chat].everyone) {
				entries[chat][tags.user] = tags["display-name"];
			} else {
				getTargetInfo(tags.user, chat, tags.interface.name, _super, function(info) {
					if(options[chat].followers && info.follow &&
						(options[chat].folThresh ?
							(info.folDiff / 1000 / 60 / 60 / 24 / 30) >
							options[chat].folThresh : true)) {
						entries[chat][tags.user] = tags["display-name"];
					}
					if(options[chat].subs && info.sub &&
						(options[chat].subThresh ?
							(info.subDiff / 1000 / 60 / 60 / 24 / 30) >
							options[chat].subThresh : true)) {
						entries[chat][tags.user] = tags["display-name"];
					}
				});
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

function getTargetInfo(target, channel, interface, _super, callback) {
	_super.interfaces[interface].getInfoAboutUser(target, channel, function(userInfo) {
		callback(userInfo);
	});
}
