const Check = require('../models/check');
const sqlDb = require('../config/sql_database').connection;
const sqlDbConnectionPool = require('../config/sql_database').connectionPool;
const sql = require('mssql');
let checks = [];
let idOfLastCheckedPayment = 0; /** WHERE TO BE SAVED? **/

function getAllChecks(){
    return new Promise((resolve, reject) => {
        Check.find()
            .then((checksFromDatabase) => {
                checks = checksFromDatabase || [];
                resolve();
            })
            .catch((error) => {
                console.warn("Unable to retrieve checks");
                console.error(error);
            });
    });
}

function getIdOfNewestPayment(){
    return new Promise(((resolve, reject) => {
        sqlDb.query('SELECT TOP 1 ID FROM Payments ORDER BY ID DESC', (error, results, fields) => {
            reject(error);
            resolve(results[0].ID);
        })
    }))
}

async function executeChecks() {
    let idOfNewestPayment;
    try {
        idOfNewestPayment = await getIdOfNewestPayment();
    }
    catch (error) {
        return logCheckError(error);
    }
    let checkID = 1;
    for(let check of checks){
        let sqlStatement = check.sqlStatement + ' AND "Payments"."id" > ' + idOfLastCheckedPayment +
            ' AND "Payments"."id" <= ' + idOfNewestPayment + ';';
        sqlDb.query(sqlStatement, (error, results, fields) => {
            if(error) return logCheckError(error);
            createAlertsForAllFailedChecks(results, checkID)
        });
        checkID++;
    }
    idOfLastCheckedPayment = idOfNewestPayment;
}

function createAlertsForAllFailedChecks(paymentsThatFailedCheck, checkID){
    for(let payment of paymentsThatFailedCheck){
        createAlert(payment.PaymentID, checkID);
    }
}

function createAlert(paymentID, checkID){
    return new Promise((resolve, reject) => {
        let alert = {
            ID: null,
            CheckID: checkID,
            PaymentID: paymentID,
            Resolved: 0,
            Comment: null,
            AlertCreatedOn: new Date()
        };
        saveAlert(alert)
            .then((result) => resolve(result))
            .catch((error) => logCheckError(error));
    });

}

function saveAlert(alert){
    return new Promise((resolve, reject) => {
        let preparedStatement = createPreparedStatement();
        preparedStatement.prepare('INSERT INTO Alerts (CheckNavID, PaymentID, Resolved, AlertCreatedOn) ' +
            'VALUES (@CheckID, @PaymentID, @Resolved, @AlertCreatedOn);')
            .then((prepResults) => {
                //console.log(prepResults);
                return preparedStatement.execute({
                    CheckID: alert.CheckID,
                    PaymentID: alert.PaymentID,
                    Resolved: 0,
                    AlertCreatedOn: alert.AlertCreatedOn
                })
            })
            .then((result) => resolve(result))
            .catch((error) => logCheckError(error));
    });
}

function createPreparedStatement(){
    let ps = new sql.PreparedStatement(sqlDbConnectionPool);
    ps.input('CheckID', sql.Int);
    ps.input('PaymentID', sql.BigInt);
    ps.input('Resolved', sql.Bit);
    ps.input('AlertCreatedOn', sql.DateTime2);
    return ps;
}

function executeChecksOnInterval(intervalInSeconds){
    setInterval(executeChecks, intervalInSeconds * 1000);
}

function logCheckError(error){
    console.warn("Checks were not done successfully");
    console.error(error);
}

/** Temporary test function **/
function test(){
setTimeout(function () {
    createAlert(123, 1)
        .then((results) => console.log(results))
        .catch((err) => console.log(err));
}, 500);
}

module.exports = {
    getAllChecks,
    executeChecksOnInterval,
    test
};