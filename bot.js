const Discord = require("discord.js")
const FileSystem = require("fs")
const Sqlite3 = require("sqlite3")
const Assert = require("assert")

var token;

function InitializeToken()
{
    return new Promise(
        function(resolve, reject)
        {
            FileSystem.readFile(
                "token.txt",
                {encoding: "utf-8"},
                (err, data) =>
                {
                    if(err)
                    {
                        return reject(err);
                    }

                    resolve(data);
                }
            )
        });
}

async function InitializeSubsystems()
{
    var token = await InitializeToken();

    //
    // Setup the Discord client and login to the server
    //
    const client = new Discord.Client();

    client.on(
        "ready",
        () => 
        {
            console.log("Connected!");
        });

    client.on(
        "message",
        (message) =>
        {
            if(message.content.startsWith("!"))
            {
                var command = ParseCommand(message.content.trim());

                if(command.length > 0)
                {
                    ProcessCommand(command);
                }
            }
        });

    //
    // Start running
    //
    client.login(token);
}

function ParseCommand(Message)
{
    Assert(Message.length > 0);
    Assert(Message.charAt(0) == '!');

    // Remove the '!'
    Message = Message.slice(1, Message.length);

    // Return an array with the command and the arguments
    return Message.split(" ");
}

function ProcessCommand(Arguments)
{
    Assert(Arguments.length > 0);

    console.log("Command is: " + Arguments[0]);
    
    if(Arguments.length > 1)
    {
        for (var i=1;i<Arguments.length;i++)
        {
            console.log("Argument " + i + ": " + Arguments[i]);
        }
    }
}

InitializeSubsystems();