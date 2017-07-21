var chats = {};

module.exports = function() {
	this.addInstance = function(chat, config, _super, ignore, interface) {
		chats[chat] = config;
	};

	this.exists = true;
	this.instances = chats;

	this.runCommand = function(tags, _super) {
		let chat = tags.channel;
		let message = tags.message;
		let userDb = _super.db.getKey("users");
		console.log(tags.interface.name + "-" + tags.user);
		let userObj = userDb.getKey(tags.interface.name + "-" + tags.user);
		if(!userObj.rpg) {
			userObj.rpg = {
				score: 0,
				equipment: {},
				hp: 100,
				hpMax: 100,
				mpMax: 100,
				mp: 100,
				buffs: {}
			};
		}
		if(Date.now() - (chats[chat].scoreInterval*1000) > userObj.lastMessageTime) {
			++userObj.rpg.score;
		}
		if(tags.user == chat) {
			if(message.match(/^!give\s(\S+)\s(\d+)$/)) {
				let give = message.match(/^!give\s(\S+)\s(-?\d+)$/);
				let player = userDb.getKey(tags.interface.name + "-" + give[1]);
				if(player && player.rpg) {
					player.rpg.score += parseInt(give[2]);
				}
			}
		}
		userDb.save(userDb);
	};

	this.pullOptions = function() {
		return {
			chats: chats
		};
	}

	this.setOptions = function(options) {
		chats = options.chats;
	}

	this.exit = function() {
		return true;
	}
}