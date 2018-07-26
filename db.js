const Sqlite3 = require("sqlite3")

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

module.exports.InitializeDatabase = InitializeDatabase;
