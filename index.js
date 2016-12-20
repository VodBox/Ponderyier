var fs = require('fs');

fs.readFile('./tokens/Pond.txt', 'utf8', function(err, data) {
	console.log(err);
	console.log(data);
});