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

    await db.runAsync("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)");
    await db.runAsync("CREATE TABLE IF NOT EXISTS polls (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)");
    await db.runAsync("CREATE TABLE IF NOT EXISTS polloptions (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, pollid INTEGER)");

    return db;
}
