const sql = require('mssql');
const localDatabaseConnectionOptions = {
    server: 'aei-sql.avans.nl',
    user: 'CMAdmin',
    password: 'CadMin!A4',
    database: 'CMPaymentsA4'
};

const connectionPool = new sql.ConnectionPool(localDatabaseConnectionOptions);
let connection;

let executeSqlStatement = async (sqlStatement) => {
    //if(!connection) await getConnection();
    return new Promise((resolve, reject) => {

        connection.query(sqlStatement)
            .then(results => {
                //console.log(`The result is ${result}`)
                //console.log(result);
                resolve(results);
            })
            .catch(error => {
                reject(error);
            })
    })
};

function getConnection(){
    return new Promise((resolve, reject) => {
        connectionPool.connect()
            .then((conn) => {
                connection = conn;
                console.log("Connection to the SQL database has been made");
                resolve();
            })
            .catch((error) => {
                console.error(error);
            })
    })
}

module.exports = {
    connection,
    connectionPool,
    executeSqlStatement,
    getConnection
};