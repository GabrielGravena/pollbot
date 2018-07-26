const Discord = require("discord.js")

Discord.Client.prototype.ParseCommand = function (Message)
{
    Assert(Message.length > 0);

    // Remove the '!poll.' prefix
    Message = Message.slice(6, Message.length);

    // Return an array with the command and the arguments
    return Message.split(" ");
}

Discord.Client.prototype.ProcessCommand = async function (Message, Arguments)
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

    switch (Arguments[0])
    {
        case "createuser":

            if(Arguments.length != 2)
            {
                console.log("Invalid number of arguments for command!");
            }
            else
            {
                console.log("Creating user " + Arguments[1]);
                await this.db.runAsync("INSERT INTO users (name) VALUES ('" + Arguments[1] + "')");
            }
            break;

        case "listusers":

            if(Arguments.length != 1)
            {
                console.log("Invalid number of arguments for command!");
            }
            else
            {
                var users = await this.db.allAsync("SELECT id, name from users");

                console.log("Listing " + users.length + " users:");

                var replyMsg = "There are " + users.length + " users in the system.\n\n";

                for (var i=0;i<users.length;i++)
                {
                    replyMsg += "[" + users[i]["id"] + "] " + users[i]["name"] + "\n";
                }

                Message.reply(replyMsg);
            }
            break;

        default:

            console.log("Invalid command received: " + Arguments[0]);
            break;
    }
}

module.exports.Initialize = function (token, db)
{
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
            if(message.content.startsWith("!poll."))
            {
                console.log(`Received message from ${message.author.id}`);

                var command = client.ParseCommand(message.content.trim());

                if(command.length > 0)
                {
                    client.ProcessCommand(message, command);
                }
            }
        });

    client.db = db;

    //
    // Start running
    //
    console.log("Initializing Discord client...");
    client.login(token);
}
