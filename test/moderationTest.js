/**
 * Tests the moderation command
 */

describe('Ponder', function () {

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
