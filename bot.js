const Discord = require("discord.js")
const FileSystem = require("fs")
const Sqlite3 = require("sqlite3")
const Assert = require("assert")

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

Sqlite3.Database.prototype.runAsync = function(sql)
{
    return new Promise((resolve, reject) =>
    {
        this.run(sql, (err) =>
        {
            if (err)
            {
                reject(err);
            }

            resolve();
        })
    });
}

Sqlite3.Database.prototype.allAsync = function(sql)
{
    return new Promise((resolve, reject) =>
    {
        this.all(sql, (err, rows) =>
        {
            if (err)
            {
                reject(err);
            }

            resolve(rows);
        });
    });
}

async function InitializeDatabase()
{
    var db = new Sqlite3.Database("file.db");

    await db.runAsync("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)");

    return db;
}

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

function InitializeDiscordClient(token, db)
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

async function InitializeSubsystems()
{
    console.log("Reading token from file...");
    var token = await InitializeToken();

    console.log("Initializing database...");
    var db = await InitializeDatabase();

    InitializeDiscordClient(token, db);
}

InitializeSubsystems();