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

SqliteRunAsync = function(db, sql)
{
    return new Promise((resolve, reject) =>
    {
        db.run(sql, (err) =>
        {
            if (err)
            {
                reject(err);
            }

            resolve();
        })
    });
}

async function InitializeDatabase()
{
    var db = new Sqlite3.Database("file.db");

    await SqliteRunAsync(db, "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)");

    return db;
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
                var command = ParseCommand(message.content.trim());

                if(command.length > 0)
                {
                    ProcessCommand(command);
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

function ParseCommand(Message)
{
    Assert(Message.length > 0);

    // Remove the '!poll.' prefix
    Message = Message.slice(6, Message.length);

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