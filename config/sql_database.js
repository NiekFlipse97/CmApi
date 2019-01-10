const sql = require('mssql');
const config = {
    user: 'CMAdmin',
    password: 'CadMin!A4',
    server: 'aei-sql.avans.nl',
    database: 'CMPaymentsA4',
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

const connectionPool = new sql.ConnectionPool(config);
let connection;

let executeSqlStatement = async (sqlStatement) => {
    if(!connection) await getConnection();
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
    executeSqlStatement,
    connectionPool
};
