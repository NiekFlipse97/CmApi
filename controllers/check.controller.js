const Check = require('../models/check');
const Error = require('../errorHandling/error');
const Errors = require('../errorHandling/errorcodes');
const SQLConnection = require('../config/sql_database');
const sqlDbConnectionPool = require('../config/sql_database').connectionPool;
const sql = require('mssql');
const CheckExecutor = require('../checkExecutor/CheckExecutor');
const mongoose = require('mongoose');

const MongoSQL = require('mongo-sql');

module.exports = {
    createCheck(req, res, next) {
        let check = new Check({
            name: req.body.name, description: req.body.description,
            condition: JSON.stringify(req.body.condition)
        });
        let error = check.validateSync();
        if (error) {
            if (error.errors.name) return res.status(400).json(new Error(error.errors.name, 400));
            if (error.errors.description) return res.status(400).json(new Error(error.errors.description, 400));
            if (error.errors.condition) return res.status(400).json(new Error(error.errors.condition, 400));
        }

        let query = {
            type: 'select',
            table: 'payments',
            where: req.body.condition
        };
        let sqlStatement = MongoSQL.sql(query);
        if (new RegExp(".*(drop|alter|insert)+.*").test(sqlStatement.toString()))
            return res.status(400).json(new Error("invalid condition", 400));
        check.sqlStatement = createQuery(sqlStatement);

        /** TEST QUERY ON ACTUAL DATABASE TO VERIFY VIABILITY OF CONDITION **/
        testSqlQueryOnDatabase(sqlStatement)
            .then(() => {
                const transaction = new sql.Transaction(sqlDbConnectionPool);
                transaction.begin(err => {
                    let ps = createPreparedStatement();

                    executePreparedStatementToInsert(ps, check);

                    transaction.commit(err => {
                        if (err) console.log(err);
                    })
                });

                insertCheck(check, res)
            })
            .catch((error) => console.log(error));
    },

    getAllChecks(req, res) {
        Check.find({})
            .then(checks => {
                res.status(200).json(checks).end()
            })
            .catch(error => {
                res.status(500).json(error)
            })
    },

    getCheckById(req, res) {
        let id = req.params.id

        Check.findById(id)
            .then(check => {
                res.status(200).json(check).end()
            })
            .catch(error => {
                let err = Errors.notFound()
                res.status(err.code).json(err).end()
            })
    },

    editCheck(req, res){
        let id = req.params.id;
        if(!id) return res.status(400).json(new Error("Missing id", 400));

        let check = new Check({
            name: req.body.name, description: req.body.description,
            condition: JSON.stringify(req.body.condition)
        });
        let error = check.validateSync();
        if (error) {
            if (error.errors.name) return res.status(400).json(new Error(error.errors.name, 400));
            if (error.errors.description) return res.status(400).json(new Error(error.errors.description, 400));
            if (error.errors.condition) return res.status(400).json(new Error(error.errors.condition, 400));
        }

        let query = {
            type: 'select',
            table: 'payments',
            where: req.body.condition
        };
        let sqlStatement = MongoSQL.sql(query);
        if (new RegExp(".*(drop|alter|insert)+.*").test(sqlStatement.toString()))
            return res.status(400).json(new Error("invalid condition", 400));
        check.sqlStatement = createQuery(sqlStatement);

        // database stuff
        Check.findById(id)
            .then((checkFromDb) => {
                check.sqlID = checkFromDb;
                let updatedCheck = checkFromDb;
                updatedCheck.Name = check.Name;
                updatedCheck.Description = check.Description;
                res.status(400).json(new Error("No check exists with that id", 400));
                testSqlQueryOnDatabase(sqlStatement)
                    .then(() => {
                        const transaction = new sql.Transaction(sqlDbConnectionPool);
                        transaction.begin(err => {
                            let ps = createPreparedStatement();
                            ps.input("ID", sql.Int);

                            executePreparedStatementToInsert(ps, updatedCheck);

                            transaction.commit(err => {
                                if (err) console.log(err);
                                Check.findByIdAndUpdate(updatedCheck.ID, updatedCheck)
                                    .then(() => {
                                        delete updatedCheck.sqlID;
                                        res.status(204).json(updatedCheck);
                                    })
                            })
                        });

                    })
                    .catch((error) => console.log(error));
            })
            .catch((error) =>{
                console.log(error);
                res.status(500).json(Errors.internalServerError());
            })
    },

    deleteCheck(req, res){
        let id = req.params.id;
        if(!id) return res.status(400).json(new Error("Missing id", 400));
        if(!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json(new Error("Invalid id", 400));

        Check.findById(id)
            .then((checkFromDb) => {
                if(!checkFromDb) return res.status(404).send(Errors.notFound());

                SQLConnection.executeSqlStatement("DELETE FROM ControlChecks WHERE ID = " + checkFromDb.sqlID)
                    .then(() => {
                        Check.findByIdAndDelete(id)
                            .then(() => res.status(204).end())
                            .catch((error) => {
                                console.log(error);
                                res.status(500).json(Errors.internalServerError());
                            })
                    })
            })
            .catch((error) => {
                console.log(error);
                res.status(500).json(Errors.internalServerError());
            })
    }
};

function testSqlQueryOnDatabase(sqlStatement){
    return new Promise((resolve, reject) => {
        SQLConnection.executeSqlStatement(sqlStatement)
            .then(() => {
                resolve();
            })
            .catch(() => reject())
    })
}

let createQuery = (query) => {
    let values = query.values;
    let result = query.toString();
    for (let i = 0; i < values.length; i++) {
        result = result.replace(`$${i + 1}`, `${values[i]}`);
    }
    return result;
};

let createPreparedStatement = () => {
    let ps = new sql.PreparedStatement(sqlDbConnectionPool);
    ps.input('Name', sql.VarChar(255));
    ps.input('Description', sql.VarChar(255));
    return ps;
};



let executePreparedStatementToInsert = (ps, check) => {
    ps.prepare('INSERT INTO ControlChecks(Name, Description) VALUES(@Name, @Description);')
        .then((prepResults) => {
            ps.execute({
                Name: check.name,
                Description: check.description
            })
        })
        .catch((error) => {
            console.log(error)
        })
};

let executePreparedStatementToUpdate = (ps, check) => {
    ps.prepare('UPDATE ControlChecks SET Name = @Name, Description = @Description WHERE ID = @ID')
        .then((prepResults) => {
            ps.execute({
                Name: check.name,
                Description: check.description,
                ID: check.sqlID
            })
        })
        .catch((error) => {
            console.log(error)
        })
};

let insertCheck = (check, res) => {
    SQLConnection.executeSqlStatement('SELECT TOP 1 * FROM ControlChecks ORDER BY ID DESC')
        .then(result => {
            check.sqlID = result.recordset[0].ID

            check.save()
                .then((checkDb) => {
                    result = checkDb;
                    /** add control check to SQL database **/
                    res.json(checkDb);
                })
                .catch((err) => {
                    console.error(err);
                    res.status(500).json(Errors.internalServerError());
                });
        })
};
