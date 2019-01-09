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

let executeSqlStatement = (sqlStatement) => {
    new sql.ConnectionPool(config).connect()
        .then(pool => {
            console.log(`Connected to ${pool}`)
            return pool.query(sqlStatement)
        })
        .then(result => {
            console.log(`The result is ${result}`)
        })
        .catch(err => {
            return err
        })

}

module.exports = {
    executeSqlStatement
}