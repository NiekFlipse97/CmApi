const sql = require('mysql')
const connection = sql.createConnection({
    host: 'localhost',
    user: 'user',
    password: 'password',
    database: 'database'
})

connection.connect()

module.exports = connection