const Discord = require("discord.js")
const Assert = require("assert")

const CommandPrefix = "poll";


function IsQuote(c)
{
    if(c == '"' || c == '”' || c == '“')
    {
        return true;
    }

    return false;
}

//
// Once I figure out how to write unit tests, make sure to
// user these test cases:
//
// !poll.foo t
// !poll.foo "t"
// !poll.foo "test"
// !poll.foo "test1 test2" "test3 test4 test5" "" "test6 test7 test8 test9"
// !poll.foo bar "quotes quotes" test1 "quotes again" "quotes yet again" test2 "guess what, quotes"
//
Discord.Client.prototype.ParseCommand = function (Message)
{
    Assert(Message.length > 0);

    // Remove the prefix
    var prefixLength = 2 + CommandPrefix.length;
    Message = Message.slice(prefixLength, Message.length);

    // Split the string into chunks using space as a token
    var arguments = Message.split(" ");

    var quoteStart = -1;

    // Note: Is there such a thing as references in javascript?
    // I would like to alias a lot of this array positions to
    // make the code nice to read, but it makes me nervous that
    // javascript will just make a bunch of copies. I don't
    // like to not know what is going on behind the scenes!
    // This code already has way more copying than what I'm
    // comfortable with!
    for(var i = 0;i < arguments.length;i++)
    {
        if (IsQuote(arguments[i].charAt(0)))
        {
            if (IsQuote(arguments[i].charAt(arguments[i].length - 1)))
            {
                // This is only one word wrapped by quotes
                arguments[i] = arguments[i].slice(1, arguments[i].length - 1);
            }
            else if (arguments.length > 1 && IsQuote(arguments[i].charAt(1)))
            {
                // There is nothing inside these quotes
                arguments[i] = arguments[i].slice(2, arguments[i].length);
            }
            else
            {
                Assert(quoteStart == -1);

                // This is a quote open, record the position
                quoteStart = i;
            }
        }
        else if (IsQuote(arguments[i].charAt(arguments[i].length - 1)))
        {
            Assert(quoteStart != -1);

            // Remove the leading quote
            arguments[quoteStart] = arguments[quoteStart].slice(1, arguments[quoteStart.length - 1]);

            // Append everything between (quoteStart, currentPosition] to the quoteStart entry
            for (var j = quoteStart + 1;j <= i;j++)
            {
                let sliceStart, sliceEnd;

                // Decide how we're going to slice the current string by looking if we are in
                // the middle or in the edge
                if (j == i)
                {
                    sliceStart = 0;
                    sliceEnd = arguments[j].length - 1;
                }
                else
                {
                    sliceStart = 0;
                    sliceEnd = arguments[j].length;
                }

                arguments[quoteStart] += " " + arguments[j].slice(sliceStart, sliceEnd);
            }

            // Now we could have a few empty spaces in the arguments array, slide everything
            // to the left by that offset
            var offset = i - quoteStart;

            for (var j = i + 1;j < arguments.length;j++)
            {
                arguments[j - offset] = arguments[j];
            }

            // Our arguments array now has a few bogus entries at the end, remove them
            arguments.length -= offset;

            // Now we are ready to go back processing the rest of the strings
            i = quoteStart;
            quoteStart = -1;
        }
    }

    if(quoteStart != -1)
    {
        // There is either one word wrapped by quotes or a quote imbalance.
        if (IsQuote(arguments[quoteStart].charAt(arguments[quoteStart].length - 1)))
        {
            arguments[quoteStart] = arguments[quoteStart].slice(1, arguments[quoteStart].length - 1);
        }
        else
        {
            throw "User did not close quotes";
        }
    }

    return arguments;
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
        case "create":

            if (Arguments.length < 2)
            {
                console.log("Invalid number of arguments.");
            }
            else
            {
                console.log(`Creating poll ${Arguments[1]}...`);
                var lastID = await this.db.runAsync(`INSERT INTO polls (name, channelid) VALUES ('${Arguments[1]}', '${Message.channel.id}')`);

                if (Arguments.length > 2)
                {
                    for(var j = 2;j < Arguments.length;j++)
                    {
                        await this.db.runAsync(`INSERT INTO polloptions (name, pollid) VALUES ('${Arguments[j]}', '${lastID}')`);
                    }
                }
            }
            break;

        case "list":

            if (Arguments.length != 1)
            {
                console.log("Invalid number of arguments.");
            }
            else
            {
                var polls = await this.db.allAsync("SELECT id, name, channelid FROM polls");

                if(!polls)
                {
                    break;
                }

                console.log(`There are currently ${polls.length} polls`);

                var verb =
                    polls.length == 1
                        ? "is"
                        : "are";

                var noun = 
                    polls.length == 1
                        ? "poll"
                        : "polls";

                var replyMsg = `There ${verb}  ${polls.length} ${noun} in the system.\n\n`;

                for (var i=0;i<polls.length;i++)
                {
                    var channelId = polls[i]["channelid"];
                    var server = Message.guild;
                    
                    var channelName =
                        channelId != null
                            ? server.channels.get(channelId)
                            : "No channel";

                    replyMsg += `[${polls[i]["id"]}]  ${polls[i]["name"]} | ${channelName} \n`;
                }

                Message.reply(replyMsg);
            }
            break;

        case "view":

            if (Arguments.length != 2)
            {
                console.log("Invalid number of arguments.");
            }
            else
            {
                var pollid = Arguments[1];

                var poll = await this.db.allAsync(`SELECT name FROM polls WHERE id='${pollid}'`);

                if(!poll)
                {
                    Message.reply("Sorry, this poll does not exist!");
                    break;
                }

                var polloptions = await this.db.allAsync(`SELECT id, name FROM polloptions WHERE pollid = ${pollid}`);

                var replyMsg = `Here is your poll:\n\nName: ${poll[0]["name"]}\n\n`;

                for(var j = 0;j < polloptions.length;j++)
                {
                    replyMsg += `[${polloptions[j]["id"]}] ${polloptions[j]["name"]}\n`;
                }

                Message.reply(replyMsg);
            }
            break;

        case "vote":

            if (Arguments.length != 3)
            {
                console.log("Invalid number of arguments.");
            }
            else
            {
                var pollid = Arguments[1];
                var optionid = Arguments[2];

                await this.db.runAsync(`INSERT INTO votes (userid, pollid, optionid) VALUES ('${Message.author.id}', '${pollid}', '${optionid}')`);

                Message.reply(`Your vote was recorded! Type !${CommandPrefix}.results ${pollid} to see the partial results.`);
            }
            break;

        case "results":

            if (Arguments.length != 2)
            {
                console.log("Invalid number of arguments.");
            }
            else
            {
                var pollid = Arguments[1];

                var poll = await this.db.allAsync(`SELECT name FROM polls WHERE id='${pollid}'`);

                if(!poll)
                {
                    Message.reply("Sorry, this poll does not exist!");
                    break;
                }

                var polloptions = await this.db.allAsync(`SELECT polloptions.name as name, count(votes.optionid) as voteCount FROM polloptions LEFT JOIN votes ON votes.pollid = polloptions.pollid AND votes.optionid = polloptions.id WHERE polloptions.pollid = ${pollid} GROUP BY polloptions.id`);

                var replyMsg = `Here is your poll:\n\nName: ${poll[0]["name"]}\n\n`;

                for(var j = 0;j < polloptions.length;j++)
                {
                    var voteCount = polloptions[j]["voteCount"];

                    var verb =
                        voteCount == 1
                            ? "vote"
                            : "votes";

                    replyMsg += `${polloptions[j]["name"]} - ${voteCount} ${verb}\n`;
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
        function() 
        {
            console.log("Connected!");

            console.log(`There are ${this.users.size} users in the server.`);
            
            this.users.forEach(user =>
                {
                    var userName = user.username;
                    var userId = user.id;

                    console.log(`[${userId}] ${userName}`);
                });

        });

    client.on(
        "message",
        function(message)
        {
            if(message.content.startsWith("!poll."))
            {
                console.log(`Received message from ${message.author.id}`);

                try
                {
                    // As far as I understand variables declared with 'var' do not have block scope
                    var command = client.ParseCommand(message.content.trim());

                    if(command.length > 0)
                    {
                        client.ProcessCommand(message, command);
                    }
                }
                catch(err)
                {
                    console.log(`Failed to process message ${message.content}`);
                    message.reply("Sorry, I failed to understand you!");
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
