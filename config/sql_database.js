const sql = require('mysql');
const localDatabaseConnectionOptions = {
    host: 'localhost',
    user: 'root',
    database: 'paymentsolaptestforstudents',
    debug: true
};
const connection = sql.createConnection(localDatabaseConnectionOptions);

connection.connect();

module.exports = connection;