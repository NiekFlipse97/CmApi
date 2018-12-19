const assert = require('assert');
const chai = require('chai');
const chaiHttp = require('chai-http');
const User = require('../models/user');
const server = require('../server');
const bcrypt = require('bcrypt');
const saltRounds = 13;

chai.should();
chai.use(chaiHttp);

describe('Authentication', () => {
    let testUser;
    let testPassword;

    beforeEach((done) => {
        testPassword = "testPassword";
        bcrypt.hash(testPassword, saltRounds, (err, hash) => {
            if(err) throw err;
            testUser = new User({username: "testUser", password: hash});
            testUser.save()
                .then((userDb) => {
                    testUser = userDb;
                    done();
                })
                .catch((err) => {throw err});

        })
    })
});