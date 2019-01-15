const assert = require('assert');
const chai = require('chai');
const chaiHttp = require('chai-http');
const User = require('../models/user');
const Check = require('../models/check');
const server = require('../server').app;
const bcrypt = require('bcrypt');
const saltRounds = 13;
const authorization = require('../config/authorization');
const SQLConnection = require('../databases/sqlDatabase');

chai.should();
chai.use(chaiHttp);

describe('Checks', () => {
    let JWT;
    let testCheck;

    beforeEach((done) => {
        testCheck = new Check({name: "testName", description: "testDescription", condition: '{ MerchantAmount: { "$gt" : 200}}',
            sqlStatement: 'select "payments".* FROM "payments" WHERE "payments"."MerchantAmount" > 200'});
        let testPassword = "testPassword";

        SQLConnection.executeSqlStatement("INSERT INTO ControlChecks (Name, Description) VALUES (\'" + testCheck.name + "\'" +
            ", \'" + testCheck.description + "\');")
            .then(() => SQLConnection.executeSqlStatement("SELECT TOP 1 ID FROM ControlChecks ORDER BY ID DESC;"))
            .then((results) => {
                testCheck.sqlID = results.recordset[0].ID;
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
    });

    /*****************      POST checks     **********************/
    it.only('can create a check', (done) => {
        console.log("In the IT");
        let check = {name: "Testing Check", description: "Check for testing", condition: {MerchantAmount: 200}};

        chai.request(server)
            .post('/api/checks')
            .send(check)
            .set('X-Access-Token', JWT)
            .end((err, res) => {
                res.should.have.status(200);

                Check.findOne({name: check.name})
                    .then((checkFromDb) => {
                        chai.assert.isNotNull(checkFromDb);
                        chai.assert.isNotNull(checkFromDb.sqlStatement);
                        assert.strictEqual(checkFromDb.sqlStatement, 'select "payments".* from "payments" ' +
                            'where "payments"."MerchantAmount" = 200');
                        done();
                    });
            });
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
                        return SQLConnection.executeSqlStatement("SELECT TOP 1 ID FROM ControlChecks ORDER BY ID DESC;");
                    })
                    .then((results) => {
                        assert.strictEqual(results.recordset[0].ID, testCheck.sqlID);
                        done();
                    })
            });
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
                    .then((checkFromDb) => {
                        chai.assert.isNull(checkFromDb);

                        return SQLConnection.executeSqlStatement("SELECT TOP 1 ID FROM ControlChecks ORDER BY ID DESC;");
                    })
                    .then((results) => {
                        assert.strictEqual(results.recordset[0].ID, testCheck.sqlID);
                        done();
                    })
            });
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
                        return SQLConnection.executeSqlStatement("SELECT TOP 1 ID FROM ControlChecks ORDER BY ID DESC;");
                    })
                    .then((results) => {
                        assert.strictEqual(results.recordset[0].ID, testCheck.sqlID);
                        done();
                    })
            });
    });

    it('will not create a check without a condition', (done) => {
        let check = {name: "Testing Check", description: "Check for testing"};

        chai.request(server)
            .post('/api/checks')
            .send(check)
            .set('X-Access-Token', JWT)
            .end((err, res) => {
                res.should.have.status(400);

                Check.findOne({name: check.name})
                    .then((check) => {
                        chai.assert.isNull(check);
                        return SQLConnection.executeSqlStatement("SELECT TOP 1 ID FROM ControlChecks ORDER BY ID DESC;");
                    })
                    .then((results) => {
                        assert.strictEqual(results.recordset[0].ID, testCheck.sqlID);
                        done();
                    })
            });
    });


    /*****************      GET checks     **********************/
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


    /*****************      PUT checks     **********************/
    it('can edit a check', (done) => {
        let check = {name: "Testing Check2", description: "Check for testing2", condition: {MerchantAmount: 300}};

        chai.request(server)
            .put(`/api/checks/${testCheck._id}`)
            .send(check)
            .set('X-Access-Token', JWT)
            .end((err, res) => {
                res.should.have.status(204);

                Check.find()
                    .then((checks) => {
                        assert.strictEqual(checks.length, 1);
                        let checkDb = checks[0];
                        assert.strictEqual(checkDb.name, check.name);
                        assert.strictEqual(checkDb.description, check.description);
                        assert.strictEqual(checkDb.condition, JSON.stringify(check.condition));
                        assert.strictEqual(checkDb.sqlStatement, 'select "payments".* from "payments" ' +
                            'where "payments"."MerchantAmount" = 300');

                        done();
                    });
            });
    });

    it('will not edit a check without JWT', (done) => {
        let check = {name: "Testing Check2", description: "Check for testing2", condition: {MerchantAmount: 300}};

        chai.request(server)
            .put(`/api/checks/${testCheck._id}`)
            .send(check)
            .end((err, res) => {
                res.should.have.status(401);

                Check.find()
                    .then((checks) => {
                        assert.strictEqual(checks.length, 1);
                        let checkDb = checks[0];
                        assert.strictEqual(checkDb.name, testCheck.name);
                        assert.strictEqual(checkDb.description, testCheck.description);
                        assert.strictEqual(checkDb.condition, testCheck.condition);
                        assert.strictEqual(checkDb.sqlStatement, testCheck.sqlStatement);

                        done();
                    });
            });
    });

    it('will not edit a check without JWT', (done) => {
        let check = {name: "Testing Check2", description: "Check for testing2", condition: {MerchantAmount: 300}};

        chai.request(server)
            .put(`/api/checks/${testCheck._id}`)
            .send(check)
            .end((err, res) => {
                res.should.have.status(401);

                Check.find()
                    .then((checks) => {
                        assert.strictEqual(checks.length, 1);
                        let checkDb = checks[0];
                        assert.strictEqual(checkDb.name, testCheck.name);
                        assert.strictEqual(checkDb.description, testCheck.description);
                        assert.strictEqual(checkDb.condition, testCheck.condition);
                        assert.strictEqual(checkDb.sqlStatement, testCheck.sqlStatement);

                        done();
                    });
            });
    });

    it('will not edit a check without a name', (done) => {
        let check = {description: "Check for testing2", condition: {MerchantAmount: 300}};

        chai.request(server)
            .put(`/api/checks/${testCheck._id}`)
            .send(check)
            .set('X-Access-Token', JWT)
            .end((err, res) => {
                res.should.have.status(400);

                Check.find()
                    .then((checks) => {
                        assert.strictEqual(checks.length, 1);
                        let checkDb = checks[0];
                        assert.strictEqual(checkDb.name, testCheck.name);
                        assert.strictEqual(checkDb.description, testCheck.description);
                        assert.strictEqual(checkDb.condition, testCheck.condition);
                        assert.strictEqual(checkDb.sqlStatement, testCheck.sqlStatement);

                        done();
                    });
            });
    });

    it('will not edit a check without a description', (done) => {
        let check = {name: "Testing Check2", condition: {MerchantAmount: 300}};

        chai.request(server)
            .put(`/api/checks/${testCheck._id}`)
            .send(check)
            .set('X-Access-Token', JWT)
            .end((err, res) => {
                res.should.have.status(400);

                Check.find()
                    .then((checks) => {
                        assert.strictEqual(checks.length, 1);
                        let checkDb = checks[0];
                        assert.strictEqual(checkDb.name, testCheck.name);
                        assert.strictEqual(checkDb.description, testCheck.description);
                        assert.strictEqual(checkDb.condition, testCheck.condition);
                        assert.strictEqual(checkDb.sqlStatement, testCheck.sqlStatement);

                        done();
                    });
            });
    });

    it('will not edit a check without a condition', (done) => {
        let check = {name: "Testing Check2", description: "Check for testing2"};

        chai.request(server)
            .put(`/api/checks/${testCheck._id}`)
            .send(check)
            .set('X-Access-Token', JWT)
            .end((err, res) => {
                res.should.have.status(400);

                Check.find()
                    .then((checks) => {
                        assert.strictEqual(checks.length, 1);
                        let checkDb = checks[0];
                        assert.strictEqual(checkDb.name, testCheck.name);
                        assert.strictEqual(checkDb.description, testCheck.description);
                        assert.strictEqual(checkDb.condition, testCheck.condition);
                        assert.strictEqual(checkDb.sqlStatement, testCheck.sqlStatement);

                        done();
                    });
            });
    });


    /*****************      DELETE checks     **********************/
    it('can delete a check', (done) => {
        chai.request(server)
            .delete(`/api/checks/${testCheck._id}`)
            .set('X-Access-Token', JWT)
            .end((err, res) => {
                res.should.have.status(204);
                Check.find()
                    .then((checks) => {
                        assert.strictEqual(checks.length, 0);
                        done();
                    })
            });
    });

    it('will not delete a check without JWT', (done) => {
        chai.request(server)
            .delete(`/api/checks/${testCheck._id}`)
            .end((err, res) => {
                res.should.have.status(401);
                Check.find()
                    .then((checks) => {
                        assert.strictEqual(checks.length, 1);
                        done();
                    })
            });
    });

    it('will not delete anything with ', (done) => {
        chai.request(server)
            .delete(`/api/checks/doesnotexist`)
            .set('X-Access-Token', JWT)
            .end((err, res) => {
                res.should.have.status(404);
                Check.find()
                    .then((checks) => {
                        assert.strictEqual(checks.length, 1);
                        done();
                    })
            });
    });
});