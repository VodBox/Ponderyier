var fs = require('fs');

var interfaces = {};

fs.readFile('./config.json', 'utf8', function(err, data) {
	if(err) {
		console.log(err);
		process.exit();
	} else {
		var result = JSON.parse(data);
		for(var key in result) {
			interfaces[key] = new require("./interfaces/" + key + "/main.js")(result[key]);
		}
	}
});
