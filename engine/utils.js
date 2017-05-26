/**
 * Utils contains useful helper functions that are used across several
 * functions.
 */

exports.getValueOrDefault = getValueOrDefault;
exports.wrapInPromise = wrapInPromise;
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

/**
 * Wraps a callback API in a promise
 * @param {Object} funcToWrap - the function to wrap in a promise
 * @param {String} arg - the argument to pass to that function
 * @return a promise containing array of files, or an error
 */
function wrapInPromise(funcToWrap, arg) {
	return new Promise((resolve, reject) => {
		funcToWrap(arg, (error, files) => {
			if (error) {
				reject(new Error(error));
			} else {
				resolve(files);
			}
		});
	});
}
