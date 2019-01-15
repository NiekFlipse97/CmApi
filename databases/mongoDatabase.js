const config = require('../config/config');
const mongoose = require('mongoose');

// changes to use some newer underlying functionality to prevent deprecation problems
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.Promise = global.Promise;

let isInTest = typeof global.it === 'function';

//isInTest = true;
if(!isInTest)
{
    mongoose.connect(config.databases.mongo_atlas, {useNewUrlParser: true})
        .then(() => {
            console.log("Connection to the production Mongo database at Atlas has been made");
        })
        .catch((err) => console.log(err));
}
else
{
    mongoose.connect(config.databases.mongotest_atlas, {useNewUrlParser: true})
        .then(() => {
            console.log("Connection to the local Mongo test database has been made");
        })
        .catch((err) => console.log(err));
}
