const mongoose = require('mongoose');

beforeEach((done) => {
    const { checks, users } = mongoose.connection.collections;

    checks.drop(() => {
        users.drop(() => {
            done();
        })
    })
});