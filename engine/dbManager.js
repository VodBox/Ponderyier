/**Database Manager */
const fs = require("fs");

module.exports = function(filepath) {
	if(!filepath) {
		filepath = "main.json";
	}
	this.filepath = filepath;
	let self = this;
	parseFile(filepath, self, function() {
		if(self.store === undefined) {
			self.store = {};
		}
	});

	this.createObject = createObject;
	this.createArray = createArray;

	this.getKey = getKey;
	this.setKey = setKey;
	this.removeKey = removeKey;
};

function createObject(filepath, callback) {
	fs.writeFile("../db/" + filepath, "{}", function(err) {
		if(err) {
			callback({
				"error": true,
				"type": "reference",
				"filepath": filepath
			});
		} else {
			callback({
				"error": false,
				"type": "reference",
				"filepath": filepath
			});
		}
	});
}

function createArray(filepath, callback) {
	fs.writeFile("../db/" + filepath, "[]", function(err) {
		if(err) {
			callback({
				"error": true,
				"type": "reference",
				"filepath": filepath
			});
		} else {
			callback({
				"error": false,
				"type": "reference",
				"filepath": filepath
			});
		}
	});
}

function getKey(key) {
	return this.store[key];
}

function setKey(key, value) {
	if(typeof value !== "function") {
		if(value !== undefined && value !== null) {
			if(value.type && value.type == "reference" && value.filepath) {
				if(!value.error) {
					this.store[key] = new module.exports(value.filepath);
				}
			} else {
				this.store[key] = value;
			}
		}
	}
	save(this);
}

function removeKey(key) {
	delete this.store[key];
}

function save(self) {
	fs.writeFile('./db/' + self.filepath, JSON.stringify(self.store, function(key, value) {
		if(value instanceof module.exports) {
			return {
				type: "reference",
				filepath: value.filepath
			};
		}
		return value;
	}, 2), function(err) {
		if(err) {
			console.error(err);
		}
	});
}

function parseFile(filepath, self, callback) {
	fs.readFile("./db/" + filepath, function(err, data) {
		if(err) {
			console.error(err);
			callback();
		} else {
			try {
				self.store = JSON.parse(data);
				if(typeof self.store === "object" && !Array.isArray(self.store)) {
					connectRefsObj(self.store);
				} else if(typeof self.store === "object") {
					connectRefsArr(self.store);
				}
			} catch(e) {
				self.store = undefined;
			}
			callback();
		}
	});
}

function connectRefsObj(obj) {
	for(let key in obj) {
		if(typeof obj[key] === "object" && !Array.isArray(obj[key])) {
			if(obj[key].type && obj[key].type == "reference" && obj[key].filepath) {
				obj[key] = new module.exports(obj[key].filepath);
			} else {
				connectRefsObj(obj[key]);
			}
		} else if(typeof obj[key] === "object") {
			connectRefsArr(obj[key]);
		}
	}
}

function connectRefsArr(arr) {
	for(let index in arr) {
		let item = arr[index];
		if(typeof item === "object" && !Array.isArray(item)) {
			if(item.type && item.type == "reference" && item.filepath) {
				arr[index] = new module.exports(item.filepath);
			} else {
				connectRefsObj(item);
			}
		} else if(typeof item === "object") {
			connectRefsArr(item);
		}
	}
}

/*let test = new module.exports();
setTimeout(function() {
	test.createObject("test.json", function(res) {
		test.setKey("test", res);
		test.createArray("array.json", function(res2) {
			test.getKey("ref").setKey("array", res2);
			test.getKey("list")[2].setKey("thing", true);
			console.log(test.getKey("ref").getKey("array"));
			setTimeout(function () {
				console.log(test.getKey("ref").getKey("array").store);
				test.getKey("ref").getKey("array").setKey(0, "test");
			}, 1000);
		});
	});
}, 5000);*/

/**const Datastore = require('nedb');
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
});**/
