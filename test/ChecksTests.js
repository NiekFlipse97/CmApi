const assert = require('assert');
const chai = require('chai');
const chaiHttp = require('chai-http');
const User = require('../models/user');
const Check = require('../models/check');
const server = require('../server').app;
const bcrypt = require('bcrypt');
const saltRounds = 13;
const authorization = require('../config/authorization');

chai.should();
chai.use(chaiHttp);

describe('Authentication', () => {
    let JWT;
    let testCheck;

    beforeEach((done) => {
        testCheck = new Check({name: "testName", description: "testDescription", condition: '{ MerchantAmount: { "$gt" : 200}}',
            sqlStatement: 'SELECT "Payments".* FROM "Payments" WHERE "Payments"."MerchantAmount" > 200'});
        let testPassword = "testPassword";
        bcrypt.hash(testPassword, saltRounds, (err, hash) => {
            if(err) throw err;
            let testUser = new User({username: "testUser", password: hash});
            testUser.save()
                .then((userDb) => {
                    testUser = userDb;
                    JWT = authorization.encodeToken(testUser._id);
                    return testCheck.save();
                })
                .then((checkDb) => {
                    testCheck = checkDb;
                    done();
                })
                .catch((err) => {throw err});
        });
    });

    /** POST checks **/
    it('can create a check', (done) => {
        let check = {name: "Testing Check", description: "Check for testing", condition: {MerchantAmount: 200}};

        chai.request(server)
            .post('/api/checks')
            .send(check)
            .set('X-Access-Token', JWT)
            .end((err, res) => {
                res.should.have.status(200);

                Check.findOne({name: check.name})
                    .then((check) => {
                        chai.assert.isNotNull(check);
                        chai.assert.isNotNull(check.sqlStatement);
                        assert.strictEqual(check.sqlStatement, 'SELECT "Payments".* FROM "Payments" ' +
                            'WHERE "Payments"."MerchantAmount" = 200');
                        done();
                    })
            })
    });

    it('will not create a check without a JWT', (done) => {
        let check = {name: "Testing Check", description: "Check for testing", condition: {MerchantAmount: 200}};

        chai.request(server)
            .post('/api/checks')
            .send(check)
            .end((err, res) => {
                res.should.have.status(401);

                Check.findOne({name: check.name})
                    .then((check) => {
                        chai.assert.isNull(check);
                        done();
                    })
            })
    });

    it('will not create a check without a name', (done) => {
        let check = {description: "Check for testing", condition: {MerchantAmount: 200}};

        chai.request(server)
            .post('/api/checks')
            .send(check)
            .set('X-Access-Token', JWT)
            .end((err, res) => {
                res.should.have.status(400);

                Check.findOne({description: check.description})
                    .then((check) => {
                        chai.assert.isNull(check);
                        done();
                    })
            })
    });

    it('will not create a check without a description', (done) => {
        let check = {name: "Testing Check", condition: {MerchantAmount: 200}};

        chai.request(server)
            .post('/api/checks')
            .send(check)
            .set('X-Access-Token', JWT)
            .end((err, res) => {
                res.should.have.status(400);

                Check.findOne({name: check.name})
                    .then((check) => {
                        chai.assert.isNull(check);
                        done();
                    })
            })
    });

    it('will not create a check without a condition', (done) => {
        let check = {name: "Testing Check", description: "Check for testing"};

        chai.request(server)
            .post('/api/checks')
            .send(check)
            .set('X-Access-Token', JWT)
            .end((err, res) => {
                res.should.have.status(200);

                Check.findOne({name: check.name})
                    .then((check) => {
                        chai.assert.isNull(check);
                        done();
                    })
            })
    });

    /** GET checks**/
    it('can get checks', (done) => {
        let testCheck2 = new Check({name: "testName2", description: "testDescription2", condition: 'MerchantAmount: 0',
            sqlStatement: 'SELECT "Payments".* FROM "Payments" WHERE "Payments"."MerchantAmount" = 0'});
        testCheck2.save()
            .then(() => {
                chai.request(server)
                    .get('/api/checks')
                    .set('X-Access-token', JWT)
                    .end((err, res) => {
                        res.should.have.status(200);
                        chai.assert.isNotNull(res.body);
                        chai.expect(res.body).to.be.an('array');
                        assert.strictEqual(res.body.length, 2);
                        chai.assert.strictEqual(res.body[0].name, testCheck.name);
                        chai.assert.strictEqual(res.body[1].name, testCheck2.name);
                        done();
                    });
            });
    });

    it('will not get checks without JWT', (done) => {
        chai.request(server)
            .get('/api/checks')
            .end((err, res) => {
                res.should.have.status(401);
                done();
            });
    });

    it('can get a check by id', (done) => {
        chai.request(server)
            .get(`/api/checks/${testCheck._id}`)
            .set('X-Access-Token', JWT)
            .end((err, res) => {
                res.should.have.status(200);
                chai.assert.isNotNull(res.body);
                assert.strictEqual(res.body._id.toString(), testCheck._id.toString());
                assert.strictEqual(res.body.name, testCheck.name);
                done();
            });
    });

    it('will not get a check by id without JWT', (done) => {
        chai.request(server)
            .get(`/api/checks/${testCheck._id}`)
            .end((err, res) => {
                res.should.have.status(401);
                done();
            });
    });

    /** PUT checks **/

    /** DELETE checks **/
});