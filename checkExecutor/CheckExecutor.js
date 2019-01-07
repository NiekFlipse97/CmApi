const Check = require('../models/check');
const sqlDb = require('../config/sql_database');
const mysql = require('mysql');
let checks = [];
let idOfLastCheckedPayment; /** WHERE TO BE SAVED? **/

function getAllChecks(){
    Check.find()
        .then((checksFromDatabase) => checks = checksFromDatabase || [])
        .catch((error) => console.log(error));
}

function getIdOfNewestPayment(){
    return new Promise(((resolve, reject) => {
        sqlDb.query('SELECT TOP 1 ID FROM Payments ORDER BY ID DESC', (error, results, fields) => {
            if(error) throw error;
            return results[0].ID;
        })
    }))
}

async function executeChecks() {
    let idOfNewestPayment = await getIdOfNewestPayment();
    let checkID = 1;
    for(let check of checks){
        let sqlStatement = check.sqlStatement + ' AND "Payments"."id" > ' + idOfLastCheckedPayment +
            ' AND "Payments"."id" <= ' + idOfNewestPayment + ';';
        sqlDb.query(sqlStatement, (error, results, fields) => {
            if(error) {
                console.log(error);
                /** throw error? **/
            }
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
    let alert = {
        ID: null,
        CheckID: checkID,
        PaymentID: paymentID,
        Resolved: 0,
        Comment: null,
        AlertCreatedOn: new Date()
    };
    sqlDb.query(createInsertQueryForAlert(alert), (error, results, fields) => {
        if(error) {
            console.log(error);
            throw error;
        }
    })
}

function createInsertQueryForAlert(alert){
    let query = 'INSERT INTO "Alerts" (CheckNavID, PaymentID, Resolved, AlertCreatedIb) VALUES (?, ?, ?, ?);';
    let insert = [alert.CheckID, alert.PaymentID, alert.Resolved, alert.AlertCreatedOn];
    return mysql.format(query, insert);
}

function executeChecksOnInterval(intervalInSeconds){
    setInterval(executeChecks, intervalInSeconds * 1000);
}


module.exports = {
    getAllChecks,
    executeChecksOnInterval
};