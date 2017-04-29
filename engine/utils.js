/**
 * Utils contains useful helper functions that are used across several
 * functions.
 */

exports.getValueOrDefault = getValueOrDefault;

/**
 * Returns the value if present, else retuns the default value.
 *
 * @param {*} value the value to return if present
 * @param {*} defaultValue the to return if absent
 */
function getValueOrDefault(value, defaultValue) {
	if (typeof value !== 'undefined') {
		return value;
	} else {
		return defaultValue;
	}
}
