var fs = require('fs');

var twitch = require('./twitch.js');
var twitchBot;

fs.readFile('./config.json', 'utf8', function(err, data) {
	if(err) {
		console.log(err);
		process.exit();
	} else {
		var result = JSON.parse(data);
		var username = result.username;
		var channels = result.channels;
		if(result.token) {
			var oauthToken = result.token;
			twitchBot = new twitch(username, channels, oauthToken);
		} else {
			fs.readFile(result.tokenLocation, 'utf8', function(error, dat) {
				if(error) {
					console.log(error);
					process.exit();
				} else {
					var oauthToken = dat;
					twitchBot = new twitch(username, channels, oauthToken);
				}
			});
		}
	}
});
