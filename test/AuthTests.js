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
        bcrypt.hash(testPassword, saltRounds)
            .then((hash) => {
                testUser = new User({username: "testUser", password: hash});
                testUser.save()
                    .then((userDb) => {
                        testUser = userDb;
                        done();
                    });
            });
    });

    it('will return a JWT token when login is correct', (done) => {
        chai.request(server)
            .post('/api/auth')
            .send({
                username: testUser.username,
                password: testPassword
            })
            .end((err, res) => {
                res.should.have.status(200);
                chai.assert.isNotNull(res.body);
                authorization.decodeToken(res.body.token, (err, payload) => {
                    User.findById(payload.sub)
                        .then((userDb) => {
                            chai.assert.isNotNull(userDb);
                            assert.strictEqual(userDb.username, testUser.username);
                            done();
                        })
                });
            });
    });

    it('will not return a JWT token when password is incorrect', (done) => {
        chai.request(server)
            .post('/api/auth')
            .send({
                username: testUser.username,
                password: "hsdhfhksjd"
            })
            .end((err, res) => {
                res.should.have.status(401);
                chai.assert.isNotNull(res.body);
                chai.expect(res.body).to.not.have.property('Token');
                done();
            });
    });

    it('will not return a JWT token when username is incorrect', (done) => {
        chai.request(server)
            .post('/api/auth')
            .send({
                username: "d",
                password: testPassword
            })
            .end((err, res) => {
                res.should.have.status(401);
                chai.assert.isNotNull(res.body);
                chai.expect(res.body).to.not.have.property('Token');
                done();
            });
    });
});