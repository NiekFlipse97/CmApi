const Check = require('../models/check');
const Error = require('../errorHandling/error');
const Errors = require('../errorHandling/errorcodes');
const SQLConnection = require('../databases/sqlDatabase');
const sqlDbConnectionPool = require('../databases/sqlDatabase').connectionPool;
const sql = require('mssql');
const CheckExecutor = require('../checkExecutor/CheckExecutor');
const mongoose = require('mongoose');

const MongoSQL = require('mongo-sql');

module.exports = {
    createCheck(req, res, next) {
        let check = new Check({
            name: req.body.name,
            description: req.body.description,
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
        if(sqlStatement.query.includes("undefined")) return res.status(400).json(new Error("Invalid condition", 400));

        /** TEST QUERY ON ACTUAL DATABASE TO VERIFY VIABILITY OF CONDITION **/
        testSqlQueryOnDatabase(check.sqlStatement)
            .then((results) => {
                if(typeof results === 'undefined') return res.status(400).json(new Error("Invalid condition", 400));
                const transaction = new sql.Transaction(sqlDbConnectionPool);
                transaction.begin(err => {
                    let ps = createPreparedStatement();

                    executePreparedStatementToInsert(ps, check)
                        .then(() => insertCheck(check, res));

                    transaction.commit(err => {
                        if (err) console.log(err);
                    })
                });
            })
            .catch((error) => {
                res.status(400).json(new Error("invalid condition", 400));
                if(error) console.log(error);
            });
    },

    getAllChecks(req, res) {
        Check.find({isActive: true}, {sqlID: 0, isActive: 0, __v: 0})
            .then(checks => {
                res.status(200).json(checks)
            })
            .catch(error => {
                res.status(500).json(error)
            })
    },

    getCheckById(req, res) {
        let id = req.params.id;

        Check.findById(id, {sqlID: 0, isActive: 0, __v: 0})
            .then(check => {
                if(!check) throw new Errors.notFound();
                res.status(200).json(check);
            })
            .catch(error => {
                let err = Errors.notFound();
                res.status(err.code).json(err)
            })
    },

    editCheck(req, res){
        let id = req.params.id;
        if(!id) return res.status(400).json(new Error("Missing id", 400));

        let check = new Check({
            name: req.body.name,
            description: req.body.description,
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
        if(sqlStatement.query.includes("undefined")) return res.status(400).json(new Error("Invalid condition", 400));

        // database stuff
        Check.findById(id)
            .then((checkFromDb) => {
                if(!checkFromDb) res.status(400).json(new Error("No check exists with that id", 400));
                checkFromDb.name = check.name;
                checkFromDb.description = check.description;
                checkFromDb.condition = JSON.stringify(check.condition);
                checkFromDb.sqlStatement = createQuery(sqlStatement);
                testSqlQueryOnDatabase(checkFromDb.sqlStatement)
                    .then((results) => {
                        if(typeof results === 'undefined') return res.status(400).json(new Error("Invalid condition", 400));
                        const transaction = new sql.Transaction(sqlDbConnectionPool);
                        transaction.begin(err => {
                            let ps = createPreparedStatement();
                            ps.input("ID", sql.Int);

                            executePreparedStatementToUpdate(ps, checkFromDb)
                                .then(() => checkFromDb.save())
                                .then(() => res.status(204).end())
                                .catch((error) => {
                                    console.log(error);
                                    res.status(500).json(Errors.internalServerError());
                                });

                            transaction.commit(err => {
                                if (err) console.log(err);
                            })
                        });

                    })
                    .catch((error) => {
                        res.status(400).json(new Error("Invalid condition", 400));
                        if(error) console.log(error)
                    });
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

                checkFromDb.isActive = false;
                Check.findByIdAndUpdate(id, checkFromDb)
                    .then(() => res.status(204).end())
                    .catch((error) => {
                        console.log(error);
                        res.status(500).json(Errors.internalServerError());
                    })
                // SQLConnection.executeSqlStatement("DELETE FROM ControlChecks WHERE ID = " + checkFromDb.sqlID)
                //     .then(() => {
                //         Check.findByIdAndDelete(id)
                //             .then(() => res.status(204).end())
                //             .catch((error) => {
                //                 console.log(error);
                //                 res.status(500).json(Errors.internalServerError());
                //             })
                //     })
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
            .then((results) => {
                resolve(results);
            })
            .catch(() => reject())
    })
}

let createQuery = (query) => {
    let values = query.values;
    let result = query.toString();
    for (let i = 0; i < values.length; i++) {
        let string = addQuotesIfString(values[i]);
        result = result.replace(`$${i + 1}`, `${string}`);
    }
    return result;
};

let addQuotesIfString = function(value){
    let stringObject = "test";
    if(typeof value === typeof stringObject){
        return '\'' + value + '\'';
    }
    else return value;
};

let createPreparedStatement = () => {
    let ps = new sql.PreparedStatement(sqlDbConnectionPool);
    ps.input('Name', sql.VarChar(255));
    ps.input('Description', sql.VarChar(255));
    return ps;
};



let executePreparedStatementToInsert = (ps, check) => {
    return new Promise((resolve, reject) => {
        ps.prepare('INSERT INTO ControlChecks(Name, Description) VALUES(@Name, @Description);')
            .then((prepResults) => {
                ps.execute({
                    Name: check.name,
                    Description: check.description
                })
                .then((results) => {
                    resolve(results);
                })
            })
            .catch((error) => {
                console.log(error)
            })
    })
};

let executePreparedStatementToUpdate = (ps, check) => {
    return new Promise((resolve, reject) => {
        ps.prepare('UPDATE ControlChecks SET Name = @Name, Description = @Description WHERE ID = @ID')
            .then((prepResults) => {
                ps.execute({
                    Name: check.name,
                    Description: check.description,
                    ID: check.sqlID
                })
                    .then((results) => {
                        resolve(results);
                    })
            })
            .catch((error) => {
                console.log(error)
            })
    });
};

let insertCheck = (check, res) => {
    SQLConnection.executeSqlStatement('SELECT TOP 1 * FROM ControlChecks ORDER BY ID DESC')
        .then(result => {
            check.sqlID = result.recordset[0].ID;

            check.save()
                .then((checkDb) => {
                    result = checkDb;
                    res.json(checkDb);
                })
                .catch((err) => {
                    console.error(err);
                    res.status(500).json(Errors.internalServerError());
                });
        })
};