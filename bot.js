const FileSystem = require("fs")
const Db = require("./db.js")
const DiscordClient = require("./discordclient.js")
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

async function InitializeSubsystems()
{
    console.log("Reading token from file...");
    var token = await InitializeToken();

    console.log("Initializing database...");
    var db = await Db.InitializeDatabase();

    DiscordClient.InitializeDiscordClient(token, db);
}

InitializeSubsystems();