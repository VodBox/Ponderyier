const request = require("request");
var chats = {};

module.exports = function() {
	this.addInstance = function(chat, config, _super, ignore, interface) {
		chats[chat] = config;
	};

	this.exists = true;

	this.runCommand = function(tags, _super) {
		let message = tags.message;
		let chat = tags.channel;
		let interface = tags.interface.name;
		console.log(tags.interface);
		if(tags.user == chat) {
			if(message == "!raid") {
				getRaidTargets(chats[chat].targets, interface, _super, function(target) {
					_super.interfaces[interface].sendMessage(chat, target.name +
						" is live with " + target.game + ", at " +
						_super.interfaces[interface].urlRoot + target.name);
				});
			} else if(message.match(/^\!raid\s+(\S+)$/)) {
				let parseable = chats[chat].message;
				let target = message.match(/^\!raid\s+(\S+)$/)[1];
				parseable = parseable.replace(/\$\{target\}/gi, target)
					.replace(/\$\{url\}/gi, _super.interfaces[interface].urlRoot + target);
				getTargetInfo(target, interface, _super, function(info) {
					parseable = parseable.replace(/\$\{game\}/gi, info.game)
						.replace(/\$\{viewers\}/gi, info.viewers)
						.replace(/\$\{title\}/gi, info.title);
					_super.interfaces[interface].sendMessage(chat, parseable);
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

function getRaidTargets(targets, interface, _super, callback) {
	if(targets.length === 0) {
		return;
	}
	getTargetInfo(targets[0], interface, _super, function(info) {
		if(info.live) {
			callback(info);
		}
		targets.shift();
		getRaidTargets(targets, interface, _super, callback);
	});
}

function getTargetInfo(target, interface, _super, callback) {
	_super.interfaces[interface].getInfoAboutStream(target, function(userInfo) {
		callback(userInfo);
	});
}
