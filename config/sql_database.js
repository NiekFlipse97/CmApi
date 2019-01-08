const sql = require('mssql');
const localDatabaseConnectionOptions = {
    server: 'aei-sql.avans.nl',
    user: 'CMAdmin',
    password: 'CadMin!A4',
    database: 'CMPaymentsA4'
};
const connectionPool = new sql.ConnectionPool(localDatabaseConnectionOptions);
const connection = connectionPool.connect()
    .then(() => console.log("Connection to the SQL database has been made"));

module.exports = {
    connection,
    connectionPool
};