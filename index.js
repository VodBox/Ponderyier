var fs = require('fs');
var WebSocket = require('ws');

var heapdump = require('heapdump');

var username;
var oauthToken;

var channels;

var callbacks = [];

var commandRefs = {};

var irc;

fs.readFile('./config.json', 'utf8', function(err, data) {
	if(err) {
		console.log(err);
		process.exit();
	} else {
		var result = JSON.parse(data);
		username = result.username;
		channels = result.channels;
		if(result.token) {
			oauthToken = result.token;
			startPond();
		} else {
			fs.readFile(result.tokenLocation, 'utf8', function(error, dat) {
				if(error) {
					console.log(error);
					process.exit();
				} else {
					oauthToken = dat;
					startPond();
				}
			});
		}
	}
});

function startPond() {
	irc = new WebSocket("wss://irc-ws.chat.twitch.tv/");
	irc.on('open', function (event) {
		irc.on('message', function(message) {
			var data = message;
			console.log(data);
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
					issueCallbacks(tags["type"], tags);
					//console.log(tags);
					//console.log(tags.channel + ": <" + (tags["display-name"] ? tags["display-name"] : tags["user"]) + "> " + tags["message"]);
				}
			}
		});
		irc.send('PASS ' + oauthToken);
		irc.send('NICK ' + username);
		irc.send('CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership');
		fs.readdir('./channels/', function(err, files) {
			for(var i = 0, l = files.length; i < l; ++i) {
				irc.send('JOIN #' + files[i].replace('.json', ''));
				fs.readFile('./channels/' + files[i], function(error, response) {
					var config = JSON.parse(response);
					for(var x = 0, j = config.commands.length; x < j; ++x) {
						if(!commandRefs[config.commands[x].command]) {
							commandRefs[config.commands[x].command] = new require('./' + config.commands[x].command)();
						}
						commandRefs[config.commands[x].command].addInstance(config.channel, config.commands[x].config);
					}
				});
			}
		});
	});
}

function reloadPond() {
	var reloaded = {};
	for(var command in commandRefs) {
		commandRefs[command].exit();
		delete commandRefs[command];
	}
	commandRefs = {};
	fs.readdir('./channels/', function(err, files) {
		for(var i = 0, l = files.length; i < l; ++i) {
			irc.send('JOIN #' + files[i].replace('.json', ''));
			fs.readFile('./channels/' + files[i], function(error, response) {
				var config = JSON.parse(response);
				for(var x = 0, j = config.commands.length; x < j; ++x) {
					if(!reloaded[config.commands[x].command]) {
						reloaded[config.commands[x].command] = true;
						delete require.cache[__dirname + '/' + config.commands[x].command + '.js'];
					}
					if(!commandRefs[config.commands[x].command]) {
						commandRefs[config.commands[x].command] = new require('./' + config.commands[x].command)();
					}
					commandRefs[config.commands[x].command].addInstance(config.channel, config.commands[x].config);
				}
			});
		}
	});
}

function on(type, callback) {
	if(!callbacks[type]) {
		callbacks[type] = [];
	}
	callbacks[type][callbacks[type].length] = callback;
} 

function issueCallbacks(type, data) {
	if(callbacks[type]) {
		for(var i = 0, l = callbacks[type].length; i < l; ++i) {
			callbacks[type][i](data);
		}
	}
	if(callbacks['all'] && type == "all") {
		for(var i = 0, l = callbacks['all'].length; i < l; ++i) {
			callbacks['all'][i](data);
		}
	}
}

var symbols = ['<', '>', '?', ',', "'", '='];

on('PRIVMSG', function(data) {
	console.log(data.channel + ": <" + (data["display-name"] ? data["display-name"] : data["user"]) + "> " + data["message"]);
	if(data["message"] == "!v5Reload" && data["user"] == "dillonea") {
		reloadPond();
	}
	for(var command in commandRefs) {
		var result = commandRefs[command].runCommand(data);
		if(result !== undefined) {
			console.log(result);
			irc.send('PRIVMSG #' + data["channel"] + ' :' + symbols[Math.floor(Math.random() * symbols.length)] + " - " + result);
		}
	}
});