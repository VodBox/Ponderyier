var fs = require('fs');
var WebSocket = require('ws');
var path = require('path');

var username;
var oauthToken;

var channels = {};

var callbacks = [];

var irc;

module.exports = function(config, main) {
	this.connected = false;
	this._super = main;
	this.username = config.username;
	if(config.token) {
		this.oauthToken = config.token;
		startPond();
	} else {
		fs.readFile(config.tokenLocation, 'utf8', function(error, dat) {
			if(error) {
				console.log(error);
				process.exit();
			} else {
				oauthToken = dat;
				startPond(this);
			}
		});
	}
	this.addChannel = function(channel) {
		if(connected) {
			joinChannel(channel);
		} else {
			joinQueue[joinQueue.length] = channel;
		}
	};
	return this;
};

var joinQueue = [];

function startPond(that) {
	irc = new WebSocket("wss://irc-ws.chat.twitch.tv/");
	irc.on('open', function (event) {
		irc.on('message', function(message) {
			var data = message;
			if(data.trim() == "PING :tmi.twitch.tv") {
				irc.send("PONG :tmi.twitch.tv");
				console.log("PONGED");
			}else {
				var tags = {}
				var tagPart = "";
				tagPart = data.split(" ")[0];
				if(tagPart.charAt(0) == "@") {
					tagPart = tagPart.slice(1,tagPart.length);
				}
				var keyValuePairs = tagPart.split(";");
				for(var i = 0, pairs = keyValuePairs.length; i < pairs; ++i) {
					var key = keyValuePairs[i].split("=")[0];
					var value = keyValuePairs[i].replace(key + "=", "");
					tags[key] = value;
				}
				if(data.match(/tmi.twitch.tv .+ \#\S+ \:/)) {
					var contents = data.replace(tagPart + " ", "").split(/\:(.+)/)[1].split(/\:(.+)/);
					//console.log(contents);
					if(contents[0].match(/tmi.twitch.tv (.+) \#\S+ /)) {
						tags["type"] = contents[0].match(/tmi.twitch.tv (.+) \#\S+ /)[1];
						tags["channel"] = contents[0].match(/tmi.twitch.tv .+ \#(\S+) /)[1];
						tags["user"] = contents[0].split("!")[0];
						tags["message"] = contents[1];
					} else {
						tags["message"] = "";
					}
					issueCallbacks(tags["type"], tags, that);
					//console.log(tags);
					//console.log(tags.channel + ": <" + (tags["display-name"] ? tags["display-name"] : tags["user"]) + "> " + tags["message"]);
				}
			}
		});
		irc.send('PASS ' + oauthToken);
		irc.send('NICK ' + username);
		irc.send('CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership');
		that.connected = true;
		for(var i = 0, l = joinQueue.length; i < l; ++i) {
			joinChannel(joinQueue[i], that);
		}
	});
}

function joinChannel(config, that) {
	channels[config.url] = config;
	irc.send('JOIN #' + config.url);
	for(var x = 0, j = config.commands.length; x < j; ++x) {
		that._super.registerCommand({
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

function on(type, callback) {
	if(!callbacks[type]) {
		callbacks[type] = [];
	}
	callbacks[type][callbacks[type].length] = callback;
}

function issueCallbacks(type, data, that) {
	if(callbacks[type]) {
		for(var i = 0, l = callbacks[type].length; i < l; ++i) {
			callbacks[type][i](data, that);
		}
	}
	if(callbacks['all'] && type == "all") {
		for(var i = 0, l = callbacks['all'].length; i < l; ++i) {
			callbacks['all'][i](data, that);
		}
	}
}

var symbols = ['<', '>', '?', ',', "'", '='];

on('PRIVMSG', function(data, that) {
	console.log(data.channel + ": <" + (data["display-name"] ? data["display-name"] : data["user"]) + "> " + data["message"]);
	if(data["message"] == "!v5Reload" && data["user"] == "dillonea") {
		that._super.reload();
	} else {
		data["interface"] = {
			"name": "twitch",
			"properties": {

			}
		};
		var options = {
			"message": data,
			"commands": channels[data["channel"]].commands
		};
		that._super.runCommand(options, function(result) {
			irc.send('PRIVMSG #' + data["channel"] + ' :' + symbols[Math.floor(Math.random() * symbols.length)] + " - " + result);
		});
	}
});
