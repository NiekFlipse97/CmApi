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

    it('will return a JWT token when login is correct', (done) => {
        testUser.password = testPassword;
        chai.request(server)
            .post('/api/auth')
            .send(testUser)
            .end((err, res) => {
                res.should.have.status(200);
                authorization.decodeToken(res.body.token, (error, payload) => {
                    User.findById(payload.sub)
                        .then((userDb) => {
                            assert.strictEqual(userDb.username, testUser.username);
                            done();
                        })
                        .catch((error) => {
                            throw error;
                        });
                });
            });
    });

    it('will not return a JWT token when password is incorrect', (done) => {
        testUser.password = testPassword;
        chai.request(server)
            .post('/api/auth')
            .send({
                username: testUser.username,
                password: "not" + testPassword
            })
            .end((err, res) => {
                res.should.have.status(401);
                chai.assert.isUndefined(res.body.token);
                done()
            });
    });

    it('will not return a JWT token when username is incorrect', (done) => {
        testUser.password = testPassword;
        chai.request(server)
            .post('/api/auth')
            .send({
                username: "not" + testUser.username,
                password: testPassword
            })
            .end((err, res) => {
                res.should.have.status(401);
                chai.assert.isUndefined(res.body.token);
                done()
            });
    });

    it('will not return a JWT token when username is missing', (done) => {
        testUser.password = testPassword;
        chai.request(server)
            .post('/api/auth')
            .send({
                password: "not" + testPassword
            })
            .end((err, res) => {
                res.should.have.status(401);
                chai.assert.isUndefined(res.body.token);
                done()
            });
    });

    it('will not return a JWT token when password is missing', (done) => {
        testUser.password = testPassword;
        chai.request(server)
            .post('/api/auth')
            .send({
                username: testUser.username
            })
            .end((err, res) => {
                res.should.have.status(401);
                chai.assert.isUndefined(res.body.token);
                done()
            });
    });
});