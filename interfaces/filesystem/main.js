/**
 * main.js of filesystem interface. Reads a chat from a passed in JSON file.
 * primarily intended for testing purposes, and illustrating how an interface works.
 */
const fs = require('fs');
var messages; //An array of messages

module.exports = function(config, main) {
    /**
     * addChannel is called when __
     * @param {Object} channel 
     */
    this.addChannel = (channel) => {
        console.log("filesystem addChannel has been called with argument " + channel);
    }
    this.router = main;
    runFilesystemChannel(this);
    return this;
}

/**
 * Starts the filesystem interface
 * @param {Object} self 
 */
function runFilesystemChannel(self) {
    console.log("Filesystem Channel started");
    //Read the data from the specified file
    fs.readFile('./interfaces/filesystem/data.json', 'utf-8', (err, data) => {
        //Check for errors
        if (err) {
            console.log(err);
            return;
        }
        //parse the returned data as JSON, and store it in the messages array
        messages = JSON.parse(data);
        setTimeout(processNextMessage, 1000, messages.shift());
    });
}

/**
 * Processes the next message, then schedules the next message to be processed
 * @param {Object} message 
 */
function processNextMessage(message) {
    // console.log("callback");
    console.log(message);
    let nextMessage = messages.shift();
    if(nextMessage !== undefined) {
        setTimeout(processNextMessage, 1000, nextMessage);
    }
}
