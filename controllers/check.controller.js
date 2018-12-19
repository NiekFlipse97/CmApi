const Check = require('../models/Check');
const Error = require('../errorHandling/error');
const ErrorCode = require('../errorHandling/errorcodes');
const MongoSQL = require('mongo-sql');

module.exports = {
    createCheck(req, res, next){
        let check = new Check({name: req.body.name, description: req.body.description, condition: req.body.condition});
        let error = check.validateSync();
        if(error)
        {
            if(error.errors.name) return res.status(400).json(new Error(error.error.name, 400));
            if(error.errors.description) return res.status(400).json(new Error(error.errors.description, 400));
            if(error.errors.condition) return res.status(400).json(new Error(error.errors.condition, 400));
        }

        let query = {
            type: 'select',
            table: 'payments',
            where: req.body.condition
        };
        let sqlStatement = MongoSQL.sql(query);
        if(new RegExp(".*(drop|alter|insert)+.*").test(sqlStatement.toString()))
            return res.status(400).json(new Error("invalid condition", 400));
        let sqlQuery = createQuery(sqlStatement);
        check.sqlStatement = sqlQuery;

        /** TEST QUERY ON ACTUAL DATABASE TO VERIFY VIABILITY OF CONDITION **/

        let result;
        check.save()
            .then((checkDb) => {
                result = checkDb;
                /** add control check to SQL database **/
                res.json(checkDb);
            })
            .catch((err) => {
                console.error(err);
                res.status(500).json(ErrorCode.internalServerError());
            });
    }
};

let createQuery = (query) => {
    let values = query.values;
    let result = query.toString();
    for(let i = 0; i < values.length; i++){
        result = result.replace(`$${i + 1}`, `${values[i]}`);
    }
    return result;
};