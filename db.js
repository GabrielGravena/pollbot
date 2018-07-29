const Sqlite3 = require("sqlite3")

Sqlite3.Database.prototype.runAsync = function(sql)
{
    return new Promise((resolve, reject) =>
    {
        this.run(sql, function (err)
        {
            if (err)
            {
                reject(err);
            }

            resolve(this.lastID);
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

module.exports.Create = async function()
{
    var db = new Sqlite3.Database("file.db");

    await db.runAsync(
        `CREATE TABLE IF NOT EXISTS polls (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            channelid TEXT NOT NULL,
            UNIQUE (channelid))`);

    //
    // What is the flag value?
    //
    // If a poll allows an user to vote only once, all the poll options for that
    // specific poll will have the same flag, if the poll allows the user to pick
    // multiple options each poll option will have a different value.
    //
    // This is done so that we can insert votes in the db with only one SQL statement,
    // regardless of the poll type. Of course there might be a better way to do this,
    // but this works for now.
    //
    await db.runAsync(
        `CREATE TABLE IF NOT EXISTS polloptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            pollid INTEGER NOT NULL,
            flag INTEGER DEFAULT 0,
            FOREIGN KEY (pollid) REFERENCES polls(id))`);
        
    await db.runAsync(
        `CREATE TABLE IF NOT EXISTS votes (
            userid TEXT NOT NULL,
            pollid INTEGER NOT NULL,
            optionid INTEGER NOT NULL,
            flag INTEGER NOT NULL,
            FOREIGN KEY (pollid) REFERENCES polls(id),
            FOREIGN KEY (optionid) REFERENCES polloptions(id),
            PRIMARY KEY (userid,pollid,optionid),
            UNIQUE (pollid, userid, flag))`);

    return db;
}
