const assert = require('assert');
const chai = require('chai');
const chaiHttp = require('chai-http');
const User = require('../models/user');
const server = require('../server').app;
const bcrypt = require('bcrypt');
const saltRounds = 13;
const authorization = require('../config/authorization');

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
        });
    });

    xit('will return a JWT token when login is correct', (done) => {
        chai.request(server)
            .post('/auth')
            .send({})
            .end((err, res) => {
                res.should.have.status(200);
                chai.assert.isNotNull(res.body);
                let payload = authorization.decodeToken(res.body);
                User.findById(payload.sub)
                   .then((userDb) => {
                       chai.assert.isNotNull(userDb);
                       assert.strictEqual(userDb.username, testUser.username);
                       done();
                   })
                   .catch((error) => {
                       throw error;
                   });
            });
    });
});