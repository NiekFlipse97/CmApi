const Check = require('../models/check');
const Error = require('../errorHandling/error');
const Errors = require('../errorHandling/errorcodes');
const MongoSQL = require('mongo-sql');

let createQuery = (query) => {
    let values = query.values;
    let result = query.toString();
    for(let i = 0; i < values.length; i++){
        result = result.replace(`$${i + 1}`, `${values[i]}`);
    }
    return result;
};

module.exports = {
    createCheck(req, res, next){
        let check = new Check({name: req.body.name, description: req.body.description,
            condition: JSON.stringify(req.body.condition)});
        let error = check.validateSync();
        if(error)
        {
            if(error.errors.name) return res.status(400).json(new Error(error.errors.name, 400));
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
        check.sqlStatement = createQuery(sqlStatement);

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
                res.status(500).json(Errors.internalServerError());
            });
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

    deleteCheck(req, res) {
        let id = req.params.id

        Check.findByIdAndDelete(id)
            .then(check => {
                res.status(204).json({deleted: check.name})
            })
            .catch(err => {
                res.status(404).json(Errors.notFound())
            })
    }
};