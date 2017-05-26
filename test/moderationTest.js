/**
 * Tests the moderation command
 */

const assert = require('assert');
const moderationModule = require('../commands/moderation/index.js');
var moderation = new moderationModule();

describe('Moderation', function () {
	beforeEach("Instantiate Moderation Module", function () {
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

	describe('moderation module', function () {
		it("should exist", function () {
			if (!moderation) {
				assert.fail("not exists");
			}
		});

		it("should have a function runCommand()", function () {
			if (!moderation.runCommand) {
				assert.fail("not exists");
			}
		});

		it("should have a function addInstance()", function () {
			if (!moderation.addInstance) {
				assert.fail("not exists");
			}
		});
	});

	describe("Caps", function () {
		it("should bop too many caps", function (done) {
			const tags = {
				message: "THIS IS A SENTENCE IN ALL CAPS",
				user: "normalUser",
				channel: "testChat",
				emotes: "",
				interface: { name: "testInterface" }
			};
			const dummyManager = {
				interfaces: {
					testInterface: {
						purgeUser: () => {
							console.log("purgeUser called");
							done();
						},
						sendMessage: () => {
							console.log("sendMessage called");
							// done();
						}
					}
				}
			};
			const result = moderation.runCommand(tags, dummyManager);
		});
		it("should ignore regulars and above");
	});

	describe("Symbols/Emotes", function () {
		it("should bop too many symbols/emotes", function (done) {
			const tags = {
				message: "(╯°□°）╯︵ ┻━┻) (╯°□°）╯︵ ┻━┻) (╯°□°）╯︵ ┻━┻)",
				user: "normalUser",
				channel: "testChat",
				emotes: "",
				interface: { name: "testInterface" }
			};
			const dummyManager = {
				interfaces: {
					testInterface: {
						purgeUser: () => {
							console.log("purgeUser called");
							done();
						},
						sendMessage: () => {
							console.log("sendMessage called");
							// done();
						}
					}
				}
			};
			const result = moderation.runCommand(tags, dummyManager);
		});
		it("should ignore regulars and above");
	});

	describe("Links", function () {
		it("should bop unsolicited links");
		it("should ignore regulars and above");
		it("should ignore users who have been given permission");
	});

	describe("Bad Words", function () {
		it("should bop bad words", function (done) {
			const tags = {
				message: "badword badword badword",
				user: "normalUser",
				channel: "testChat",
				emotes: "",
				interface: { name: "testInterface" }
			};
			const dummyManager = {
				interfaces: {
					testInterface: {
						purgeUser: () => {
							console.log("purgeUser called");
							done();
						},
						sendMessage: () => {
							console.log("sendMessage called");
							// done();
						}
					}
				}
			};
			const result = moderation.runCommand(tags, dummyManager);
		});
		it("should ignore regulars and above");
	});

	describe("Spam", function () {
		it("should bop spammy users");
		it("should ignore regulars and above");
	});
});
