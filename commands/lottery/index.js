/**
 * The Lottery command allows a lottery to be run
 *
 * //TODO: explain what this command does in natural language
 */

var chats = {};
var guesses = {};
var enabled = {};

module.exports = function() {
	this.addInstance = function(chat, config, _super, ignore, interface) {
		chats[chat] = config;
		console.log(config);
		guesses[chat] = {};
	};

	this.exists = true;

	this.instances = chats;

	this.runCommand = function(tags, _super) {
		let message = tags.message;
		let chat = tags.channel;
		if(tags.user == chat) {
			if(message == "!lreset") {
				guesses[chat] = {};
				return "Lottery Guesses Reset"
			} else if(message == "!lottery") {
				enabled[chat] = !enabled[chat];
				return "Lottery " + (enabled[chat] ? "enabled." : "disabled.");
			} else if(message.match(/^\!lwinner\s+(-?(\d+)|(\d+\.)|(\d*\.*(\d+)))$/)) {
				let result = parseFloat(message.match(/^\!lwinner\s+(-?(\d+)|(\d+\.)|(\d*\.*(\d+)))$/)[1]);
				let closest = "";
				let closestDiff = Infinity;
				for(let key in guesses[chat]) {
					if(chats[chat].priceIsRightRules) {
						let diff = result - guesses[chat][key];
						if(diff >= 0 && diff < closestDiff) {
							closestDiff = diff;
							closest = key;
						}
					} else {
						let diff = Math.abs(result - guesses[chat][key]);
						if(diff < closestDiff) {
							closestDiff = diff;
							closest = key;
						}
					}
				}
				if(closestDiff < Infinity) {
					return "The closest to " + result + " is " + closest + " with a guess of " + guesses[chat][closest] + ".";
				} else {
					return "No winner for " + result + ".";
				}
			}
		} else if(enabled[chat] && message.match(/^-?\d*\.*(\d+)?$/)){
			guesses[chat][tags.user] = parseFloat(message);
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
