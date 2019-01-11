const Check = require('../models/check');
const Error = require('../errorHandling/error');
const Errors = require('../errorHandling/errorcodes');
const SQLConnection = require('../config/sql_database');
const sqlDbConnectionPool = require('../config/sql_database').connectionPool;
const sql = require('mssql');
const CheckExecutor = require('../checkExecutor/CheckExecutor');

const MongoSQL = require('mongo-sql');

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

let executePreparedStatement = (ps, check) => {
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
        SQLConnection.executeSqlStatement(sqlStatement)
            .then(() => {
                const transaction = new sql.Transaction(sqlDbConnectionPool);
                transaction.begin(err => {
                    let ps = createPreparedStatement()

                    executePreparedStatement(ps, check)

                    transaction.commit(err => {
                        if (err) console.log(err);
                        CheckExecutor.getAllChecks();
                    })
                })

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
    }
};