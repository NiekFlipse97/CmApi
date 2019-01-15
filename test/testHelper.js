const Check = require('../models/check');
const User = require('../models/user');
const SQLConnection = require('../databases/sqlDatabase');

beforeEach((done) => {
    Check.deleteMany()
        .then(() => User.deleteMany())
        .then(() => done())
});

afterEach((done) => {
    SQLConnection.executeSqlStatement("DELETE FROM ControlChecks WHERE Name IN ('testName', 'Testing Check')")
        .then(() => done());
});