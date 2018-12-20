const Check = require('../models/check');
const User = require('../models/user');

beforeEach((done) => {
    Check.deleteMany()
        .then(() => User.deleteMany())
        .then(() => done())
});