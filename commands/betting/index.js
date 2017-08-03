/*
		Currently depends on RPG for gaining score in the first place.
 */

var chats = {};
var enabled = {};
var bets = {};

module.exports = function() {
	this.addInstance = function(chat, config, _super, ignore, interface) {
		chats[chat] = config;
		bets[chat] = [];
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
		if(tags.user == chat || tags.mod == 1) {
			if(message.match(/^!bet\sopen\s/)) {
				enabled[chat] = true;
				return "Bet has been opened.";
			} else if(message.match(/^!bet\sclose$/)) {
				enabled[chat] = false;
				return "Bet has been closed.";
			} else if(message.match(/^!bet\swinner\s(\d+)$/)) {
				let winner = message.match(/^!bet\swinner\s(\d+)$/)[1];
				let winners = {};
				let paidOut = 0;
				for(let i = 0, l = bets[chat].length; i < l; ++i) {
					if(bets[chat][i].target == winner) {
						winners[bets[chat][i].user] = true;
						let user = userDb.getKey(tags.interface.name + "-" + bets[chat][i].user);
						user.rpg.score += bets[chat][i].amount * chats[chat].payoutRatio;
						paidOut += bets[chat][i].amount * chats[chat].payoutRatio;
					}
				}
				bets[chat] = [];
				userDb.save(userDb);
				return Object.keys(winners).length + " people have won a total of " + paidOut + " points.";
			}
		}
		if(enabled[chat]) {
			if(message.match(/^!bet\s(\d+)\s(\d+)/)) {
				let bet = message.match(/^!bet\s(\d+)\s(\d+)/);
				if(userObj.rpg.score >= bet[1]) {
					bets[chat][bets[chat].length] = {
						user: tags.user,
						target: bet[2],
						amount: bet[1]
					};
					userObj.rpg.score -= parseInt(bet[1]);
					userDb.save(userDb);
					return tags.user + " bet " + bet[1] + " on " + bet[2] + ".";
				}
				userDb.save(userDb);
				return tags.user + ": You do not have enough score for that bet.";
			} else if(message.match(/!bet\sall\s(\d+)$/)) {
				if(userObj.rpg.score > 0) {
					let target = message.match(/!bet\sall\s(\d+)$/)[1];
					let amount = userObj.rpg.score;
					bets[chat][bets[chat].length] = {
						user: tags.user,
						target: bet[1],
						amount: amount
					};
					userObj.rpg.score = 0;
					userDb.save(userDb);
					return tags.user + " bet " + amount + " on " + bet[1] + ".";
				}
				return tags.user + ": You do not have any score to bet with.";
			}
		}
		userDb.save(userDb);
	};

	this.pullOptions = function() {
		return {
			chats: chats,
			bets: bets
		};
	}

	this.setOptions = function(options) {
		chats = options.chats;
		bets = options.bets;
	}

	this.exit = function() {
		return true;
	}
}