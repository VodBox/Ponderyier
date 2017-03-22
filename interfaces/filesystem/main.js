/**
 * main.js of filesystem interface. Reads a chat from a passed in JSON file.
 * primarily intended for testing purposes, and illustrating how an interface works.
 */
const fs = require('fs');
const channels = new Map();

module.exports = function(config, router) {
    this.addChannel = addChannel;
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
}

/**
 * Processes the next message, then schedules the next message to be processed
 * @param {Object} message 
 */
function processNextMessage(messages, router) {
    const messageRecieved = messages.shift();
    console.log(messageRecieved);
    const message = {
        "message": messageRecieved,
        "commands": channels.get("data").commands
    };
    router.runCommand(message, (commandResponse) => {
        console.log("command's response is " + commandResponse);
    })
    if(messages.length > 0) {
        setTimeout(processNextMessage, 1000, messages, router);
    }
}

/**
 * addChannel is called when __
 * @param {Object} channel 
 */
function addChannel(channel, router) {
    console.log("filesystem addChannel has been called with argument " + channel);
    console.log(channel);
    channels.set(channel.id, channel);
    channel.commands.forEach((commandOptions) => {
        console.log(commandOptions);
        router.registerCommand({
            "command": commandOptions.command,
            "reload": false,
            "interface": {
                "name": "filesystem",
                "destination": channel.id,
                "options": commandOptions.config
            }
        });
    });
    fs.readFile('./interfaces/filesystem/data.json', 'utf-8', (err, data) => {
        //Check for errors
        if (err) {
            console.log(err);
            return;
        }
        //parse the returned data as JSON, and store it in the messages array
        const messages = JSON.parse(data);
        setTimeout(processNextMessage, 1000, messages, router);
    });
}
