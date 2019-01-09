const sql = require('mssql')
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
}

const connectionPool = new sql.ConnectionPool(config);
let connection;

let executeSqlStatement = async (sqlStatement) => {
    if(!connection) await getConnection();

    connection.query(sqlStatement)
        .then(result => {
            console.log(`The result is ${result}`)
            console.log(result);
        })
        .catch(err => {
            return err
        })
}

function getConnection(){
    return new Promise((resolve, reject) => {
        connectionPool.connect()
            .then((conn) => {
                connection = conn;
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
}