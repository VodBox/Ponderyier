var fs = require('fs');

interfaces = {};

fs.readFile('./config.json', 'utf8', function(err, data) {
	if(err) {
		console.log(err);
		process.exit();
	} else {
		var result = JSON.parse(data);
		for(var key in result) {
			interfaces[key] = new require("./interfaces/" + key + "/main.js")(result[key], this);
		}
	}
});

fs.readdir('./channels/', function(err, files) {
	for(var i = 0, l = files.length; i < l; ++i) {
		fs.readFile('./channels/' + files[i], function(error, response) {
			var config = JSON.parse(response);
			for(var key in config) {
				if(key != "channel") {
					interfaces[key].addChannel(config[key]);
				}
			}
		});
	}
});

isDebugging(function(err, res) {
	if(err) {
		console.log('Something went wrong trying to detect debug mode...');
	} else if(res) {
		var heapdump = require('heapdump');
		console.log('debug mode has been detected');
	}
});

function isDebugging(cb) {
	require('net').createServer().on('error', function(err) {
		if (err.code === 'EADDRINUSE')
			cb(null, true);
		else
			cb(err);
	}).listen(process.debugPort, function() {
		this.close();
		cb(null, false);
	});
}
