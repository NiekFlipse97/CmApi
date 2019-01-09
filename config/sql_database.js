const sql = require('mssql')
const config = {
    user: 'CMAdmin',
    password: 'CadMin!A4',
    server: 'aei-sql.avans.nl',
    port: 1443,
    database: 'CMPaymentsA4',
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
}

new sql.ConnectionPool(config).connect()
    .then(pool => {
        return pool.query('SELECT 1 + 1 AS result')
    })
    .then(result => {
        console.dir(result)
    })
    .catch(err => {
        console.log(err)
    })
module.exports = sql