/**Twitch Interface */
const fs = require('fs');
const WebSocket = require('ws');
const path = require('path');
const request = require('request');

let channels = {};
let joinQueue = [];
let callbacks = [];
let symbols = ['<', '>', '?', ',', "'", '='];
let irc; //websocket connection to Twitch IRC chat server
let headers = {
	"Accept": "application/vnd.twitchtv.v5+json"
};

var self;

module.exports = function (config, manager) {
	this.urlRoot = "https://twitch.tv/";
	this.connected = false; //indicates if a connection to twitch has been established
	this.manager = manager;
	this.username = config.username;
	this.sendMessage = sendMessage;
	this.purgeUser = purgeUser;
	this.kickUser = kickUser;
	this.banUser = banUser;
	this.getInfoAboutStream = getInfoAboutStream;
	this.getInfoAboutUser = getInfoAboutUser;
	self = this;
	if (config.clientID) {
		this.clientID = config.clientID;
	} else if(config.clientIDLocation) {
		fs.readFile(config.clientIDLocation, 'utf8', function (err, dat) {
			if(err) {
				console.error(new Error("Unable to find client-id file\n" + err));
			} else {
				self.clientID = dat;
			}
		});
	}
	if (config.clientSecret) {
		this.clientSecret = config.clientSecret;
	} else if(config.clientSecretLocation) {
		fs.readFile(config.clientSecretLocation, 'utf8', function (er, da) {
			if(er) {
				console.error(new Error("Unable to find client-id file\n" + er));
			} else {
				self.clientSecret = da;
			}
		});
	}
	if (config.token) {
		this.oauthToken = config.token;
		start(this);
	} else {
		fs.readFile(config.tokenLocation, 'utf8', function (error, data) {
			if (error) {
				console.error(new Error("Unable to find token file\n" + error));
				process.exit();
			} else {
				self.oauthToken = data;
				start(self);
			}
		});
	}
	this.addChannel = function (channel) {
		if (this.connected) {
			joinChannel(channel, manager);
		} else {
			joinQueue[joinQueue.length] = channel;
		}
	};
	return this;
};

/**
 * Starts the connection to twitch
 * @param  {Object} that - the twitch object
 */
function start(that) {
	irc = new WebSocket("wss://irc-ws.chat.twitch.tv/");
	irc.on('message', (message) => {
		let data = message;
		if (data.trim() == "PING :tmi.twitch.tv") {
			irc.send("PONG :tmi.twitch.tv");
			console.log("PONGED");
		} else {
			let tags = {};
			let tagPart = "";
			tagPart = data.split(" ")[0];
			if (tagPart.charAt(0) == "@") {
				tagPart = tagPart.slice(1, tagPart.length);
			}
			let keyValuePairs = tagPart.split(";");
			for (let i = 0, pairs = keyValuePairs.length; i < pairs; ++i) {
				let key = keyValuePairs[i].split("=")[0];
				let value = keyValuePairs[i].replace(key + "=", "");
				tags[key] = value;
			}
			if (data.match(/tmi.twitch.tv .+ \#\S+ \:/)) {
				let contents = data.replace(tagPart + " ", "").split(/\:(.+)/)[1].split(/\:(.+)/);
				//console.log(contents);
				if (contents[0].match(/tmi.twitch.tv (.+) \#\S+ /)) {
					tags.type = contents[0].match(/tmi.twitch.tv (.+) \#\S+ /)[1];
					tags.channel = contents[0].match(/tmi.twitch.tv .+ \#(\S+) /)[1];
					tags.user = contents[0].split("!")[0];
					tags.message = contents[1];
				} else {
					tags.message = "";
				}
				issueCallbacks(tags.type, tags, that);
				//console.log(tags);
				//console.log(tags.channel + ": <" + (tags.display-name ? tags.display-name : tags.user) + "> " + tags.message);
			}
		}
	});
	irc.on('open', (event) => {
		irc.send('PASS ' + that.oauthToken);
		irc.send('NICK ' + that.username);
		irc.send('CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership');
		that.connected = true;
		for (let i = 0, l = joinQueue.length; i < l; ++i) {
			joinChannel(joinQueue[i], that.manager);
		}
	});
}

/**
 * Joins a channel
 * @param {Object} config - config
 * @param {Object} manager - manager
 */
function joinChannel(config, manager) {
	channels[config.url] = config;
	irc.send('JOIN #' + config.url);
	for (let x = 0, j = config.commands.length; x < j; ++x) {
		manager.registerCommand({
			"command": config.commands[x].command,
			"reload": false,
			"interface": {
				"name": "twitch",
				"destination": config.url,
				"options": config.commands[x].config
			}
		});
	}
}

/**
 * Allows registering events
 * @param  {Object} type - the type of event
 * @param  {Object} callback - the function to call on that event
 */
function on(type, callback) {
	if (!callbacks[type]) {
		callbacks[type] = [];
	}
	callbacks[type][callbacks[type].length] = callback;
}

/**
 * for callbacks
 * @param  {Object} type -
 * @param  {Object} config -
 * @param  {Object} that -
 */
function issueCallbacks(type, data, that) {
	if (callbacks[type]) {
		for (let i = 0, l = callbacks[type].length; i < l; ++i) {
			callbacks[type][i](data, that);
		}
	}
	if (callbacks.all && type == "all") {
		for (let i = 0, l = callbacks.all.length; i < l; ++i) {
			callbacks.all[i](data, that);
		}
	}
}

/**
 * When a PRIVMSG event occurs
 * @param  {Object} data -
 * @param  {Object} that -
 */
on('PRIVMSG', (data, that) => {
	console.log(`${data.channel}: <${(data["display-name"] ? data["display-name"] : data.user)}> ${data.message}`);
	let userDb = that.manager.db.getKey("users");
	if(!userDb.getKey("twitch-" + data.user)) {
		userDb.setKey("twitch-" + data.user, {
			messagesInChat: 0,
			lastMessages: [],
			lastMessageTime: 0
		});
	}
	if (data.message == "!v5Reload" && data.user == "dillonea") {
		that.manager.reload();
	} else {
		data.interface = {
			"name": "twitch",
			"properties": {
			}
		};
		var options = {
			"message": data,
			"commands": channels[data.channel].commands
		};
		that.manager.runCommand(options, function (result) {
			sendMessage(data.channel, result);
		});
	}
	let user = userDb.getKey("twitch-" + data.user);
	++user.messagesInChat;
	user.lastMessageTime = Date.now();
	user.lastMessages.splice(0,0,data.message);
	user.lastMessages = user.lastMessages.slice(0,5);
	userDb.setKey("twitch-" + data.user, user);
});

function sendMessage(channel, message) {
	irc.send(`PRIVMSG #${channel} :${symbols[Math.floor(Math.random() * symbols.length)]} - ${message}`);
}

function purgeUser(channel, user) {
	irc.send(`PRIVMSG #${channel} :.timeout ${user} 1`);
}

function banUser(channel, user) {
	irc.send(`PRIVMSG #${channel} :.ban ${user}`);
}

function kickUser(channel, user) {
	irc.send(`PRIVMSG #${channel} :.timeout ${user}`);
}

function getInfoAboutStream(target, callback) {
	headers["Client-ID"] = self.clientID;
	getUserId(target, function(content) {
		if(!content.error) {
			let id = content.channelId;
			request({
				url: "https://api.twitch.tv/kraken/streams/" + id,
				headers: headers
			}, function(err, res, bod) {
				if(err) {
					console.error(err);
				} else {
					let stream = JSON.parse(bod);
					if(!stream.error) {
						if(stream.stream != null) {
							stream.stream.live = true;
							stream.stream.title = stream.stream.channel.status;
							stream.stream.name = (stream.stream.channel.display_name ?
									stream.stream.channel.display_name :
									stream.stream.channel.name);
							callback(stream.stream);
						} else {
							callback({live: false});
						}
					} else {
						callback({live: false});
					}
				}
			});
		} else {
			callback({live: false});
		}
	});
}

function getInfoAboutUser(target, channel, callback) {
	headers["Client-ID"] = self.clientID;
	request({
		url: "https://api.twitch.tv/kraken/users?login=" + target,
		headers: headers
	}, function(error, response, body) {
		if(error) {
			console.error(error);
		} else {
			let user = JSON.parse(body);
			if(!user.error) {
				let userId = user.users[0]._id;
				let result = {};
				getFollowStatus(userId, channel, function(res) {
					if(!res.error) {
						result = res;
					}
					getSubStatus(userId, res.channelId, function(resp) {
						if(!resp.error) {
							result.sub = resp.sub;
							if(resp.sub) {
								result.subDiff = resp.subDiff;
							}
						}
						callback(result);
					}, channel);
				});
			} else {
				callback({error: true});
			}
		}
	});
}

function getFollowStatus(userId, channel, callback) {
	getUserId(channel, function(res) {
		if(!res.error) {
			let channelId = res.channelId;
			request({
				url: "https://api.twitch.tv/kraken/users/" + userId + "/follows/channels/" + channelId,
				headers: headers
			}, function(er, re, bo) {
				if(er) {
					console.error(er);
					callback({error: true});
				} else {
					let follow = JSON.parse(bo);
					if(!follow.error) {
						callback({follow: true, folDiff: Date.now() - Date.parse(follow.created_at), channelId: channelId});
					} else {
						callback({follow: false, channelId: channelId});
					}
				}
			});
		} else {
			callback({error: true});
		}
	});
}

function getSubStatus(userId, channelId, callback, channel) {
	if(!channelId) {
		getUserId(channel, function(id) {
			getSubStatus(userId, id, callback, channel);
		});
		return;
	} else if(!channels[channel].token) {
		if(channels[channel].tokenLocation) {
			getOAuthToken(channel, function() {
				getSubStatus(userId, channelId, callback, channel);
			});
			return;
		}
		callback({error: true});
		return;
	}
	headers.Authorization = "OAuth " + channels[channel].token;
	request({
		url: "https://api.twitch.tv/kraken/channels/" + channelId + "/subscriptions/" + userId,
		headers: headers
	}, function(er, re, bo) {
		if(er) {
			console.error(er);
			callback({error: true});
		} else {
			let sub = JSON.parse(bo);
			if(!sub.error) {
				callback({sub: true, subDiff: Date.now() - Date.parse(sub.created_at), channelId: channelId});
			} else {
				callback({sub: false, channelId: channelId});
			}
		}
	});
}

function getUserId(user, callback) {
	request({
		url: "https://api.twitch.tv/kraken/users?login=" + user,
		headers: headers
	}, function(err, res, bod) {
		if(err) {
			console.error(err);
		} else {
			let streamer = JSON.parse(bod);
			if(!streamer.error) {
				let channelId = streamer.users[0]._id;
				callback({channelId: channelId});
			} else {
				callback({error: true});
			}
		}
	});
}

function getOAuthToken(channel, callback) {
	fs.readFile(channels[channel].tokenLocation, 'utf8', function (err, dat) {
		if(err) {
			channels[channel].tokenLocation = false;
		} else {
			channels[channel].token = dat;
		}
		callback();
	});
}
