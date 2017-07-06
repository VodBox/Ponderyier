var chats = {};
var entries = {};
var enabled = {};
var choices = {};

module.exports = function() {
	this.addInstance = function(chat, config, _super, ignore, interface) {
		chats[chat] = config;
		entries[chat] = {};
	};

	this.exists = true;

	this.runCommand = function(tags, _super) {
		let message = tags.message;
		let chat = tags.channel;
		if(tags.user == chat) {
			if(message.match(/^\!poll\s(\S+)\s(\S+)/)) {
				let items = message.split(" ").splice(1);
				let response = "Poll Started - Vote with";
				choices[chat] = items;
				for(let i = 0, l = items.length; i < l; ++i) {
					response += " " + (i+1) + "/" + items[i];
				}
				enabled[chat] = true;
				return response;
			} else if(message == "!poll") {
				enabled[chat] = !enabled[chat];
				if(!enabled[chat]) {
					let answers = {};
					let response = "Poll Results -";
					for(let key in entries[chat]) {
						if(answers[entries[chat][key]]) {
							++answers[entries[chat][key]];
						} else {
							answers[entries[chat][key]] = 1;
						}
					}
					let most = [];
					let mostNum = 0;
					for(let i = 0, l = choices[chat].length; i < l; ++i) {
						if(answers[choices[chat][i]]) {
							response += ", " + choices[chat][i] + "=" + answers[choices[chat][i]];
							if(answers[choices[chat][i]] > mostNum) {
								most = [choices[chat][i]];
								mostNum = answers[choices[chat][i]];
							} else if(answers[choices[chat][i]] == mostNum) {
								most[most.length] = choices[chat][i];
							}
						} else {
							response += ", " + choices[chat][i] + "=" + 0;
							if(mostNum == 0) {
								most[most.length] = choices[chat][i];
							}
						}
					}
					response += " - Winners: " + most[0];
					for(let i = 1, l = most.length; i < l; ++i) {
						response += ", " + most[i];
					}
					return response.substring(0,14) + response.substring(15);
				} else {
					choices[chat] = ["1", "2", "3"];
					return "Poll Started - Vote with 1 2 3";
				}
			}
		} else if(enabled[chat]) {
			for(var i = 0, l = choices[chat].length; i < l; ++i) {
				let num = message.match(/^(\d+)$/);
				if(num && choices[chat][parseInt(num[1])-1]) {
					entries[chat][tags.user] = choices[chat][parseInt(num[1])-1];
				} else if(message == choices[chat][i]) {
					entries[chat][tags.user] = choices[chat][i];
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
