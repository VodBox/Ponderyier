/**Database Manager */
const Datastore = require('nedb');
var db;

module.exports = function() {
	db = new Datastore({
		filename: "./config.db",
		autoload: true
	});
	this.db = db;

	this.addToChatConfig = addToChatConfig;
	this.getFromChatConfig = getFromChatConfig;
	this.addToChatConfig = addToChatConfig;
	this.removeFromCommandConfig = removeFromCommandConfig;
};

function addToChatConfig(chat, key, data, callback) {
	db.findOne({ chat: chat }, function(err, doc) {
		if(err || doc === null) {
			console.log("That Chat Does Not Exist");
		} else {
			let set = {};
			set[key] = data;
			db.update({chat: chat}, {$set: set});
			db.persistence.compactDatafile();
			callback();
		}
	});
}

function getFromChatConfig(chat, key, callback) {
	db.findOne({ chat: chat }, function(err, doc) {
		if(err || doc === null) {
			console.log("That Chat Does Not Exist");
		} else {
			callback(doc[key]);
		}
	});
}

function addToCommandConfig(chat, command, key, data) {

}

function removeFromCommandConfig(chat, command, key, data) {

}

function addChat(chat, callback) {
	db.findOne({ chat: chat }, function(err, doc) {
		if(err || doc === null) {
			if(err) {
				console.log(err);
			}
			db.insert({chat: chat});
		} else {
			db.update({chat: chat}, {chat: chat});
		}
		db.persistence.compactDatafile();
		callback();
	});
}

function getChatConfig(chat, callback) {
	db.findOne({ chat: chat }, function(err, doc) {
		if(err || doc === null) {
			if(err) {
				console.log(err);
			}
			console.log("That Chat Does Not Exist");
		} else {
			db.persistence.compactDatafile();
			callback(doc);
		}
	});
}

setInterval(function() {}, 1000);

var dbTest = new module.exports();
addChat("test", function() {
	addToChatConfig("test", "thing", Math.random(), function() {
		getFromChatConfig("test", "thing", function(data) {
			console.log(data);
		});
	});
});
