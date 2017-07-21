var chats = {};

module.exports = function() {
	this.addInstance = function(chat, config, _super, ignore, interface) {
		chats[chat] = config;
	};

	this.exists = true;
	this.instances = chats;

	this.runCommand = runCommand;

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
	};
};

function runCommand(tags, _super) {
	let chat = tags.channel;
	let message = tags.message;
	let quoteDb = _super.db.getKey("quotes");
	if(!quoteDb) {
		console.log('here');
		_super.db.createObject("quotes.json", function(res) {
			_super.db.setKey("quotes", res, function() {
				let nested = runCommand(tags, _super);
				if(nested) {
					_super.interfaces[tags.interface.name].sendMessage(chat, nested);
				}
			});
		});
	} else if(!quoteDb.getKey(chat)) {
		quoteDb.createArray("quotes-" + chat + ".json", function(res) {
			quoteDb.setKey(chat, res, function() {
				let nested = runCommand(tags, _super);
				if(nested) {
					_super.interfaces[tags.interface.name].sendMessage(chat, nested);
				}
			});
		});
	} else {
		if(message.match(/^\!quote(\s(\d+))?$/)) {
			let quoteMsg = message.match(/^\!quote(\s(\d+))?$/);
			if(quoteMsg[2]) {
				let quote = quoteDb.getKey(chat).getKey(parseInt(quoteMsg[2])-1);
				if(!quote) {
					return "That Quote Does Not Exist";
				} else {
					return quote;
				}
			} else {
				let quote = quoteDb.getKey(chat).getKey(Math.floor(Math.random() * quoteDb.getKey(chat).store.length));
				if(!quote) {
					return "No Quotes";
				} else {
					return quote;
				}
			}
		} else if((tags.mod == '1' || tags.user == chat) && message.match(/^\!quote\sadd\s(.+)$/)) {
			let quoteMsg = message.match(/^\!quote\sadd\s(.+)$/)[1];
			quoteDb.getKey(chat).setKey(quoteDb.getKey(chat).store.length, quoteMsg);
			return "Quote Added - #" + (quoteDb.getKey(chat).store.length);
		} else if(message.match(/^\!quote\s(.+)$/)) {
			let quoteMsg = message.match(/^\!quote\s(.+)$/)[1];
			let quoteStore = quoteDb.getKey(chat).store;
			let matches = [];
			for(let i in quoteStore) {
				if(quoteStore[i].toLowerCase().indexOf(quoteMsg.toLowerCase())) {
					matches[matches.length] = [quoteStore[i], i];
				}
			}
			if(matches.length > 0) {
				let match = matches[Math.floor(Math.random() * matches.length)];
				return (parseInt(match[1])+1) + "/" + quoteStore.length + " " + match[0];
			} else {
				return "No Quote Found";
			}
		}
	}
}