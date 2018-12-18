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
            if(error.errors.name) return res.status(400).json(new Error(error.error.name, ErrorCode.badRequest().code));
            if(error.errors.description) return res.status(400).json(new Error(error.errors.description, ErrorCode.badRequest().code));
            if(error.errors.condition) return res.status(400).json(new Error(error.errors.condition, ErrorCode.badRequest().code));
        }

        let sqlStatement = MongoSQL.sql().toString();
        if(new RegExp(".*(drop|alter|insert)+.*").test(sqlStatement))
            return res.status(400).json(new Error("invalid condition", 400));

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
                res.status(500).json(new Error(ErrorCode.internalServerError().message, ErrorCode.internalServerError().code));
            });
    }
};