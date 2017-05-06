/**
 * Tests the moderation command
 */

const assert = require('assert');
const moderationModule = require('../commands/moderation/index.js');
var moderation = new moderationModule();

describe('Ponder', function () {
	before("Instantiate Moderation Module", function () {
		moderation = new moderationModule();
		const config = {
				symbols: true,
				caps: true,
				emotes: true,
				badWords: true,
				spam: true,
				symbolProportion: 0.5,
				capsProportion: 0.8,
				emoteTolerance: 5,
				customBadWords: [],
				spamTolerance: 3, // per second
				verboseChat: true
		};
		moderation.addInstance('testChat', config);
	});

	describe("Caps", function () {
		it("should bop too many caps");
		it("should ignore regulars and above");
	});

	describe("Symbols", function () {
		it("should bop too many symbols");
		it("should ignore regulars and above");
	});

	describe("Links", function () {
		it("should bop unsolicited links");
		it("should ignore regulars and above");
		it("should ignore users who have been given permission");
	});

	describe("Spam", function () {
		it("should bop spammy users");
		it("should ignore regulars and above");
		it("should ignore users who have been given permission");
	});

	describe("Spam", function () {
		it("should bop spammy users");
		it("should ignore regulars and above");
	});
});
