const Discord = require("discord.js")
const Assert = require("assert")

const CommandPrefix = "poll";

var DiscordClientError = 
{
    NO_ACTIVE_POLL : 0,
    DUPLICATE_VOTE : 1,
    CHANNEL_ALREADY_HAS_POLL : 2,
    NO_SUCH_OPTION : 3,
};

class DiscordClientException extends Error
{
    constructor (ErrorMessage, ErrorNumber)
    {
        super(ErrorMessage);
        this.errno = ErrorNumber;
    }
}

//
// Some platforms will give a generic quote symbol
// others will make an effort to use open/close
// quotes, make sure we catch whatever is the case.
//
function IsQuote(c)
{
    if(c == '"' || c == '“' || c == '”')
    {
        return true;
    }

    return false;
}

function ThrowInvalidNumberOfArgumentsIf(Predicate)
{
    if (Predicate)
    {
        console.log("Invalid number of arguments.");
        throw "Invalid number of arguments.";
    }
}

Discord.Client.prototype.GetPollIdFromChannel = async function (Channel)
{
    var polls = await this.db.allAsync(`SELECT id FROM polls WHERE channelid = '${Channel.id}'`);

    if (polls.length == 0)
    {
        throw new DiscordClientException(`The channel ${Channel} has no active poll.`, DiscordClientError.NO_ACTIVE_POLL);
    }

    return polls[0]["id"];
}

Discord.Client.prototype.ShowHelp = function (Message)
{
    var replyMsg = `\`\`\`
!poll.help
\tShows this message.

!poll.create [Title] [Option 1] ... [Option n]
\t Creates a poll in the current channel.
\t Example: !poll.create "What is the best option?" "Option 1" "Option 2"

!poll.list
\t Shows a list of active polls and their channels.

!view
\t Shows the poll active in the current channel.

!vote [option number]
\t Vote on the poll active in the current channel, 'option number' is the number displayed in the !view command.
\t Example: !vote 0

!results
\t Shows the results of the channel's currently active poll.\`\`\``;

        Message.reply(replyMsg);
}

Discord.Client.prototype.CreatePoll = async function (Message, Name, Options)
{
    console.log(`Creating poll ${arguments[1]}...`);

    var channel = Message.channel;

    try
    {
        var lastID = await this.db.runAsync(`INSERT INTO polls (name, channelid) VALUES ('${Name}', '${channel.id}')`);
    }
    catch (err)
    {
        if (err.errno && err.errno == 19)
        {
            throw new DiscordClientException("Channel already has a poll.", DiscordClientError.CHANNEL_ALREADY_HAS_POLL);
        }
        else
        {
            throw err;
        }
    }

    if (arguments.length > 2)
    {
        for(var i = 0;i < Options.length;i++)
        {
            await this.db.runAsync(`INSERT INTO polloptions (name, pollid) VALUES ('${Options[i]}', '${lastID}')`);
        }
    }

    Message.reply(`Poll created! Type !view to see the details.`);
}

Discord.Client.prototype.ListPolls = async function(Message)
{
    var polls = await this.db.allAsync("SELECT id, name, channelid FROM polls");

    if(!polls)
    {
        return;
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

    var replyMsg = `There ${verb} ${polls.length} active ${noun}:\n\n`;

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

Discord.Client.prototype.View = async function (Message, PollId)
{
    var poll = await this.db.allAsync(`SELECT name FROM polls WHERE id='${PollId}'`);

    if(!poll)
    {
        Message.reply("Sorry, this poll does not exist!");
        return;
    }

    var polloptions = await this.db.allAsync(`SELECT name FROM polloptions WHERE pollid = ${PollId}`);

    var replyMsg = `Here is the poll:\n\n\`\`\`Name: ${poll[0]["name"]}\n\n`;

    for(var j = 0;j < polloptions.length;j++)
    {
        replyMsg += `[${j}] ${polloptions[j]["name"]}\n`;
    }

    replyMsg += `\`\`\``;

    Message.reply(replyMsg);
}

Discord.Client.prototype.Results = async function (Message, PollId)
{
    var poll = await this.db.allAsync(`SELECT name FROM polls WHERE id='${PollId}'`);

    if(!poll)
    {
        Message.reply("Sorry, this poll does not exist!");
        return;
    }

    var polloptions = await this.db.allAsync(`
        SELECT
            polloptions.name as name,
            count(votes.optionid) as voteCount
        FROM
            polloptions LEFT JOIN
            votes
        ON
            votes.pollid = polloptions.pollid AND
            votes.optionid = polloptions.id
        WHERE
            polloptions.pollid = ${PollId}
        GROUP BY
            polloptions.id
        ORDER BY
            voteCount DESC`);

    var replyMsg = `Here are the results:\n\n\`\`\`Name: ${poll[0]["name"]}\n\n`;

    var totalVotes = 0;
    var maxLength = 0;
    for (var j = 0;j < polloptions.length;j++)
    {
        var voteCount = polloptions[j]["voteCount"];
        totalVotes += voteCount;

        if (polloptions[j]["name"].length > maxLength)
        {
            maxLength = polloptions[j]["name"].length;
        }
    }

    for(var j = 0;j < polloptions.length;j++)
    {
        var voteCount = polloptions[j]["voteCount"];

        var verb =
            voteCount == 1
                ? "vote"
                : "votes";

        var p =
            totalVotes != 0
                ? ((voteCount / totalVotes) * 100.0).toFixed(2)
                : `0.00`;

        var length = polloptions[j]["name"].length;
        var spacesToAdd = maxLength - length;

        var name = polloptions[j]["name"];
        while (--spacesToAdd >= 0)
        {
            name = name.concat(" ");
        }

        replyMsg += `${name} - ${p}% (${voteCount} ${verb})\n`;
    }

    replyMsg += `\nNumber of votes: ${totalVotes}\`\`\``;

    Message.reply(replyMsg);
}

Discord.Client.prototype.Vote = async function (Message, PollId, OptionIndex)
{
    try
    {
        var polloptions = await this.db.allAsync(`SELECT id FROM polloptions WHERE pollid = ${PollId}`);

        if (OptionIndex >= polloptions.length || OptionIndex < 0)
        {
            throw new DiscordClientException("Invalid option.", DiscordClientError.NO_SUCH_OPTION);
        }

        optionId = polloptions[OptionIndex]["id"];

        await this.db.runAsync(`INSERT INTO votes (
            userid,
            pollid,
            optionid,
            flag) SELECT
                '${Message.author.id}' as userid,
                '${PollId}' as pollid,
                '${optionId}' as optionid,
                flag FROM polloptions WHERE id = '${optionId}'`);
    }
    catch (err)
    {
        // TODO: Is there any way to check if this is a Sqlite exception?
        //
        // See if exception is because of the user violating the table's primary key
        // constraint, in which case it is trying to vote twice for the same option
        // on the same poll.
        //
        // TODO: Kind of akward to straight up compare the error number to 19, there
        // should be someplace with the symbol definitions of error codes.
        if (err.errno && err.errno == 19)
        {
            throw new DiscordClientException("User already voted.", DiscordClientError.DUPLICATE_VOTE);
        }
        else
        {
            throw err;
        }
    }

    Message.reply(`Your vote was recorded! Type !results to see the partial results.`);
}

var CommandScope = 
{
    //
    // A command with a global scope can be issued from
    // any channel, and as such needs to identify its
    // targets, i.e. which poll to operate on.
    //
    GLOBAL : 0,

    //
    // A command with a channel scope is only valid in
    // the context of a poll channel, meaning the poll
    // id is implicit given the current channel.
    //
    CHANNEL : 1,

    MAXIMUM : 2,
};

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

    var scope;

    // See if it is a global command or channel specific
    if (Message.startsWith(`!${CommandPrefix}`))
    {
        // Remove the prefix
        var prefixLength = 2 + CommandPrefix.length;
        Message = Message.slice(prefixLength, Message.length);

        scope = CommandScope.GLOBAL;
    }
    else
    {
        // Remove the ponctuation
        Message = Message.slice(1,Message.length);

        scope = CommandScope.CHANNEL;
    }

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

    return { arguments, scope };
}

Discord.Client.prototype.ProcessCommand = async function (Message, Command)
{
    Assert(Command.scope < CommandScope.MAXIMUM);

    var arguments = Command.arguments;

    Assert(arguments.length > 0);

    console.log("Command is: " + arguments[0]);

    if(arguments.length > 1)
    {
        for (var i=1;i<arguments.length;i++)
        {
            console.log("Argument " + i + ": " + arguments[i]);
        }
    }

    switch (arguments[0])
    {
        case "help":

            this.ShowHelp(Message);
            break;

        case "create":

            ThrowInvalidNumberOfArgumentsIf(arguments.length < 2);

            await this.CreatePoll(
                Message,
                arguments[1],
                arguments.length > 1 ? arguments.slice(2) : {});

            break;

        case "list":

            ThrowInvalidNumberOfArgumentsIf(arguments.length != 1);

            await this.ListPolls(Message);
            break;

        case "view":

            var pollId;

            if (Command.scope == CommandScope.GLOBAL)
            {
                ThrowInvalidNumberOfArgumentsIf(arguments.length != 2);
                pollId = arguments[1];
            }
            else if (Command.scope == CommandScope.CHANNEL)
            {
                ThrowInvalidNumberOfArgumentsIf(arguments.length != 1);
                pollId = await this.GetPollIdFromChannel(Message.channel);
            }

            await this.View(Message, pollId);
            break;

        case "vote":

            var pollId;
            var optionId;

            if (Command.scope == CommandScope.GLOBAL)
            {
                ThrowInvalidNumberOfArgumentsIf(arguments.length != 3);
                pollId = arguments[1];
                optionId = parseInt(arguments[2]);
            }
            else if (Command.scope == CommandScope.CHANNEL)
            {
                ThrowInvalidNumberOfArgumentsIf(arguments.length != 2);
                pollId = await this.GetPollIdFromChannel(Message.channel);
                optionId = parseInt(arguments[1]);
            }

            await this.Vote(Message, pollId, optionId);            
            break;

        case "results":

            var pollId;

            if (Command.scope == CommandScope.GLOBAL)
            {
                ThrowInvalidNumberOfArgumentsIf(arguments.length != 2);
                pollId = arguments[1];
            }
            else
            {
                ThrowInvalidNumberOfArgumentsIf(arguments.length != 1);
                pollId = await this.GetPollIdFromChannel(Message.channel);
            }

            await this.Results(Message, pollId);
            break;

        default:

            console.log("Invalid command received: " + arguments[0]);
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
            console.log(`[${this.readyAt}] Connected!`);
        });

    client.on(
        "message",
        async function(message)
        {
            if(message.content.startsWith("!"))
            {
                console.log(`Received message from ${message.author.id}`);

                try
                {
                    // As far as I understand variables declared with 'var' do not have block scope
                    var command = this.ParseCommand(message.content.trim());

                    if(command.arguments.length > 0)
                    {
                        await this.ProcessCommand(message, command);
                    }
                }
                catch(err)
                {
                    if (err.errno == DiscordClientError.DUPLICATE_VOTE)
                    {
                        message.reply(`Sorry, you already voted on this poll.`);
                    }
                    else if (err.errno == DiscordClientError.NO_ACTIVE_POLL)
                    {
                        message.reply("Sorry, there is no active poll on this channel.");
                    }
                    else if (err.errno == DiscordClientError.CHANNEL_ALREADY_HAS_POLL)
                    {
                        message.reply("Sorry, this channel already has an active poll.");
                    }
                    else if (err.errno == DiscordClientError.NO_SUCH_OPTION)
                    {
                        message.reply("This option does not exist in the poll. Type !view to see the available options.");
                    }
                    else
                    {
                        message.reply("Sorry, I failed to understand you!");
                    }

                    console.log(err);
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
