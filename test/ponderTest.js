const assert = require('assert');
const ponderModule = require('../commands/ponder/index.js');
var ponder = new ponderModule();

describe('Ponder', function () {
	before("Instantiate Ponder Module", function () {
		ponder = new ponderModule();
		const config = {
			lexicalMarker: "!",
			ponderKeyword: "ponder",
			countKeyword: "pcount",
			helpKeyword: "phelp"
		};
		ponder.addInstance('testChat', config);
	});

	describe('ponder module', function () {
		it("should exist", function () {
			if (ponder) {
				assert.ok("exists");
			} else {
				assert.fail("not exists");
			}
		});

		it("should have a function runCommand()", function () {
			if (ponder.runCommand) {
				assert.ok("exists");
			} else {
				assert.fail("not exists");
			}
		});
	});

	describe('!ponder command', function () {
		it('should return a string', function () {
			const tags = {
				message: "!ponder testing the ponder command",
				user: "normalUser",
				channel: "testChat"
			};
			const ponderStr = ponder.runCommand(tags);
			if (typeof ponderStr === "string") {
				assert.ok("Is a String");
			} else {
				assert.fail("Generated ponder is not a String")
			}
		});
	});
});
