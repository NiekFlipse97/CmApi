const Check = require('../models/check');
const sqlDb = require('../databases/sqlDatabase');
const sqlDbConnectionPool = require('../databases/sqlDatabase').connectionPool;
const sql = require('mssql');
const CheckExecutorConfig = require('../models/CheckExecutorConfig');
let checks = [];
let idOfLastCheckedPayment;

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
        sqlDb.executeSqlStatement('SELECT TOP 1 ID FROM Payments ORDER BY ID DESC')
            .then((results) => {
                //console.log(results.recordset[0].ID);
                resolve(results.recordset[0].ID);
            })
            .catch((error) => {
                console.warn("Retrieving of newest PaymentID was unsuccessful");
                console.error(error);
                resolve(idOfLastCheckedPayment);
            })

    }))
}

async function executeChecks() {
    await getAllChecks();
    if(!idOfLastCheckedPayment) await getLastCheckedPaymentID();
    let idOfNewestPayment = await getIdOfNewestPayment();

    for(let check of checks){
        let sqlStatement = check.sqlStatement + ' AND "Payments"."id" > ' + idOfLastCheckedPayment +
            ' AND "Payments"."id" <= ' + idOfNewestPayment + ';';
        sqlDb.executeSqlStatement(sqlStatement)
            .then((results) => {
                createAlertsForAllFailedChecks(results.recordset, check.sqlID)
            })
            .catch((error) => logCheckError(error));
    }
    updateLastCheckedPaymentID(idOfNewestPayment);
}

function createAlertsForAllFailedChecks(paymentsThatFailedCheck, checkID){
    for(let payment of paymentsThatFailedCheck){
        //console.log(payment);
        createAlert(payment.ID, checkID);
    }
}

function createAlert(paymentID, checkID){
    //console.log(paymentID);
    let alert = {
        ID: null,
        CheckID: checkID,
        PaymentID: paymentID,
        Resolved: 0,
        Comment: null,
        AlertCreatedOn: new Date()
    };
    saveAlert(alert)
        .catch((error) => logCheckError(error));
}

function saveAlert(alert){
    return new Promise((resolve, reject) => {
        let preparedStatement = createPreparedStatement();
        preparedStatement.prepare('INSERT INTO Alerts (CheckNavID, PaymentID, Resolved, AlertCreatedOn) ' +
            'VALUES (@CheckID, @PaymentID, @Resolved, @AlertCreatedOn);')
            .then((prepResults) => {
                //console.log(prepResults);
                return preparedStatement.execute(alert)
            })
            .then((result) => {
                preparedStatement.unprepare()
                    .then(() => resolve(result))
                    .catch((error) => logCheckError(error))
            })
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

function getLastCheckedPaymentID(){
    return new Promise((resolve, reject) => {
        CheckExecutorConfig.findOne()
            .then((idObject) => {
                //console.log(idObject);
                //console.log("idObject paymentID: " + idObject.IDOfLastCheckedPayment);
                idOfLastCheckedPayment = idObject.IDOfLastCheckedPayment;
                resolve();
            })
            .catch((error) => {
                console.warn("Retrieving of lastCheckedPaymentID was unsuccessful");
                idOfLastCheckedPayment = BigInt.MAX;
                console.error(error);
            })
    })
}

function updateLastCheckedPaymentID(ID){
    //console.log("ID: " + ID);
    CheckExecutorConfig.findOneAndUpdate({IDOfLastCheckedPayment: idOfLastCheckedPayment}, {IDOfLastCheckedPayment: ID})
        .catch((error) => {
            console.warn("Updating of lastCheckedPaymentID was unsuccessful");
            console.error(error);
        });
    idOfLastCheckedPayment = ID;
}

function executeChecksOnInterval(intervalInSeconds){
    setInterval(function () {
        executeChecks()
            .then(() => console.log("Checks have been done on newest payments"))
    }, intervalInSeconds * 1000);
}

function logCheckError(error){
    console.warn("Checks were not done successfully");
    console.error(error);
}

/** Temporary test function **/
function test(){
    Check.findById("5c35e4372f3ee43324469bba")
        .then((check) => {
            //console.log("check:"); console.log(check);
            checks = [check];

            return executeChecks();
        });
}

module.exports = {
    getAllChecks,
    executeChecksOnInterval,
    test
};