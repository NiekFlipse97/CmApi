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
    it('can create a check', (done) => {
        let check = {name: "Testing Check", description: "Check for testing", condition: {MerchantAmount: 200}};
        let checkFromDatabase;
        chai.request(server)
            .post('/api/checks')
            .send(check)
            .set('X-Access-Token', JWT)
            .end((err, res) => {
                res.should.have.status(200);

                Check.findOne({name: check.name})
                    .then((checkFromDb) => {
                        checkFromDatabase = checkFromDb;
                        chai.assert.isNotNull(checkFromDatabase);
                        assert.strictEqual(checkFromDatabase.sqlStatement, 'select "payments".* from "payments" ' +
                            'where "payments"."MerchantAmount" = 200');
                        return SQLConnection.executeSqlStatement("SELECT TOP 1 ID FROM ControlChecks ORDER BY ID DESC;");
                    })
                    .then((results) => {
                        assert.strictEqual(results.recordset[0].ID, checkFromDatabase.sqlID);
                        done();
                    });
            });
    });

    it('can create a check with a condition containing a Mongo operator', (done) => {
        let check = {name: "Testing Check", description: "Check for testing", condition: {MerchantAmount: {$gt: 200}}};
        let checkFromDatabase;
        chai.request(server)
            .post('/api/checks')
            .send(check)
            .set('X-Access-Token', JWT)
            .end((err, res) => {
                res.should.have.status(200);

                Check.findOne({name: check.name})
                    .then((checkFromDb) => {
                        checkFromDatabase = checkFromDb;
                        chai.assert.isNotNull(checkFromDatabase);
                        assert.strictEqual(checkFromDatabase.sqlStatement, 'select "payments".* from "payments" ' +
                            'where "payments"."MerchantAmount" > 200');
                        return SQLConnection.executeSqlStatement("SELECT TOP 1 ID FROM ControlChecks ORDER BY ID DESC;");
                    })
                    .then((results) => {
                        assert.strictEqual(results.recordset[0].ID, checkFromDatabase.sqlID);
                        done();
                    });
            });
    });

    it.only('can create a check with a 2 conditions', (done) => {
        let check = {name: "Testing Check", description: "Check for testing", condition:  {MerchantAmount: {$gt: 200}, Status: "AUTHORIZED"} };
        let checkFromDatabase;
        chai.request(server)
            .post('/api/checks')
            .send(check)
            .set('X-Access-Token', JWT)
            .end((err, res) => {
                res.should.have.status(200);

                Check.findOne({name: check.name})
                    .then((checkFromDb) => {
                        checkFromDatabase = checkFromDb;
                        chai.assert.isNotNull(checkFromDatabase);
                        assert.strictEqual(checkFromDatabase.sqlStatement, 'select "payments".* from "payments" ' +
                            'where "payments"."MerchantAmount" > 200 and "payments"."Status" = \'AUTHORIZED\'');
                        return SQLConnection.executeSqlStatement("SELECT TOP 1 ID FROM ControlChecks ORDER BY ID DESC;");
                    })
                    .then((results) => {
                        assert.strictEqual(results.recordset[0].ID, checkFromDatabase.sqlID);
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

    it('will not create a check with a nonsensical condition', (done) => {
        let check = {name: "Testing Check", description: "Check for testing", condition: "a nonsensical condition"};

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

    it('will not create a check with a condition refering to a nonexistent column', (done) => {
        let check = {name: "Testing Check", description: "Check for testing", condition: {NotExistentColumn: 500}};

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

    it('will only get checks that are still active is true', (done) => {
        let testCheck2 = new Check({name: "testName2", description: "testDescription2", condition: 'MerchantAmount: 0',
            sqlStatement: 'SELECT "Payments".* FROM "Payments" WHERE "Payments"."MerchantAmount" = 0'});
        let testCheck3 = new Check({name: "testName3", description: "testDescription3", condition: 'MerchantAmount: 0',
            sqlStatement: 'SELECT "Payments".* FROM "Payments" WHERE "Payments"."MerchantAmount" = 0',
            isActive: false});
        testCheck2.save()
            .then(() => testCheck3.save())
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

    it('will not get a check by id without JWT', (done) => {
        chai.request(server)
            .get('/api/checks/' + testCheck._id)
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

    it('will not get a check by id without a correct check id', (done) => {
        chai.request(server)
            .get(`/api/checks/doesnotexist`)
            .set('X-Access-Token', JWT)
            .end((err, res) => {
                res.should.have.status(404);
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

                Check.findById(testCheck._id)
                    .then((checkFromDb) => {
                        assert.strictEqual(checkFromDb.name, check.name);
                        assert.strictEqual(checkFromDb.description, check.description);
                        assert.strictEqual(JSON.parse(checkFromDb.condition), JSON.stringify(check.condition));
                        assert.strictEqual(checkFromDb.sqlStatement, 'select "payments".* from "payments" ' +
                            'where "payments"."MerchantAmount" = 300');

                        SQLConnection.executeSqlStatement("SELECT * FROM ControlChecks WHERE ID = " + checkFromDb.sqlID)
                            .then((results) => {
                                let checkFromSQLDb = results.recordset[0];
                                assert.strictEqual(checkFromSQLDb.Name, check.name);
                                assert.strictEqual(checkFromSQLDb.Description, check.description);
                                done();
                            });
                    });
            });
    });

    it('will not edit a check with a incorrect id', (done) => {
        let check = {name: "Testing Check", description: "Check for testing", condition: "a nonsensical condition"};

        chai.request(server)
            .put('/api/checks/doesnotexist')
            .send(check)
            .set('X-Access-Token', JWT)
            .end((err, res) => {
                res.should.have.status(400);

                Check.findById(testCheck._id)
                    .then((checkFromDb) => {
                        assert.strictEqual(checkFromDb.name, testCheck.name);
                        assert.strictEqual(checkFromDb.description, testCheck.description);
                        assert.strictEqual(checkFromDb.condition, testCheck.condition);
                        assert.strictEqual(checkFromDb.sqlID, testCheck.sqlID);
                        assert.strictEqual(checkFromDb.sqlStatement, testCheck.sqlStatement);
                        done();
                    })
            });
    });

    it('will not edit a check without JWT', (done) => {
        let check = {name: "Testing Check2", description: "Check for testing2", condition: {MerchantAmount: 300}};

        chai.request(server)
            .put(`/api/checks/${testCheck._id}`)
            .send(check)
            .end((err, res) => {
                res.should.have.status(401);

                Check.findById(testCheck._id)
                    .then((checkFromDb) => {
                        assert.strictEqual(checkFromDb.name, testCheck.name);
                        assert.strictEqual(checkFromDb.description, testCheck.description);
                        assert.strictEqual(checkFromDb.condition, testCheck.condition);
                        assert.strictEqual(checkFromDb.sqlStatement, testCheck.sqlStatement);

                        SQLConnection.executeSqlStatement("SELECT * FROM ControlChecks WHERE ID = " + checkFromDb.sqlID)
                            .then((results) => {
                                let checkFromSQLDb = results.recordset[0];
                                assert.strictEqual(checkFromSQLDb.Name, testCheck.name);
                                assert.strictEqual(checkFromSQLDb.Description, testCheck.description);
                                done();
                            });
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

                Check.findById(testCheck._id)
                    .then((checkFromDb) => {
                        assert.strictEqual(checkFromDb.name, testCheck.name);
                        assert.strictEqual(checkFromDb.description, testCheck.description);
                        assert.strictEqual(checkFromDb.condition, testCheck.condition);
                        assert.strictEqual(checkFromDb.sqlStatement, testCheck.sqlStatement);

                        SQLConnection.executeSqlStatement("SELECT * FROM ControlChecks WHERE ID = " + checkFromDb.sqlID)
                            .then((results) => {
                                let checkFromSQLDb = results.recordset[0];
                                assert.strictEqual(checkFromSQLDb.Name, testCheck.name);
                                assert.strictEqual(checkFromSQLDb.Description, testCheck.description);
                                done();
                            });
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

                Check.findById(testCheck._id)
                    .then((checkFromDb) => {
                        assert.strictEqual(checkFromDb.name, testCheck.name);
                        assert.strictEqual(checkFromDb.description, testCheck.description);
                        assert.strictEqual(checkFromDb.condition, testCheck.condition);
                        assert.strictEqual(checkFromDb.sqlStatement, testCheck.sqlStatement);

                        SQLConnection.executeSqlStatement("SELECT * FROM ControlChecks WHERE ID = " + checkFromDb.sqlID)
                            .then((results) => {
                                let checkFromSQLDb = results.recordset[0];
                                assert.strictEqual(checkFromSQLDb.Name, testCheck.name);
                                assert.strictEqual(checkFromSQLDb.Description, testCheck.description);
                                done();
                            });
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

                Check.findById(testCheck._id)
                    .then((checkFromDb) => {
                        assert.strictEqual(checkFromDb.name, testCheck.name);
                        assert.strictEqual(checkFromDb.description, testCheck.description);
                        assert.strictEqual(checkFromDb.condition, testCheck.condition);
                        assert.strictEqual(checkFromDb.sqlStatement, testCheck.sqlStatement);

                        SQLConnection.executeSqlStatement("SELECT * FROM ControlChecks WHERE ID = " + checkFromDb.sqlID)
                            .then((results) => {
                                let checkFromSQLDb = results.recordset[0];
                                assert.strictEqual(checkFromSQLDb.Name, testCheck.name);
                                assert.strictEqual(checkFromSQLDb.Description, testCheck.description);
                                done();
                            });
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

                Check.findById(testCheck._id)
                    .then((checkFromDb) => {
                        assert.strictEqual(checkFromDb.name, testCheck.name);
                        assert.strictEqual(checkFromDb.description, testCheck.description);
                        assert.strictEqual(checkFromDb.sqlStatement, testCheck.sqlStatement);

                        SQLConnection.executeSqlStatement("SELECT * FROM ControlChecks WHERE ID = " + checkFromDb.sqlID)
                            .then((results) => {
                                let checkFromSQLDb = results.recordset[0];
                                assert.strictEqual(checkFromSQLDb.Name, testCheck.name);
                                assert.strictEqual(checkFromSQLDb.Description, testCheck.description);
                                done();
                            });
                    });
            });
    });

    it('will not edit a check with a nonsensical condition', (done) => {
        let check = {name: "Testing Check", description: "Check for testing", condition: "a nonsensical condition"};

        chai.request(server)
            .put('/api/checks/' + testCheck._id)
            .send(check)
            .set('X-Access-Token', JWT)
            .end((err, res) => {
                res.should.have.status(400);

                Check.findById(testCheck._id)
                    .then((check) => {
                        assert.strictEqual(check.name, testCheck.name);
                        assert.strictEqual(check.description, testCheck.description);
                        assert.strictEqual(check.condition, testCheck.condition);
                        assert.strictEqual(check.sqlID, testCheck.sqlID);
                        assert.strictEqual(check.sqlStatement, testCheck.sqlStatement);
                        done();
                    })
            });
    });

    it('will not edit a check with a condition refering to a nonexistent column', (done) => {
        let check = {name: "Testing Check", description: "Check for testing", condition: {NotExistentColumn: 500}};

        chai.request(server)
            .put('/api/checks/' + testCheck._id)
            .send(check)
            .set('X-Access-Token', JWT)
            .end((err, res) => {
                res.should.have.status(400);

                Check.findById(testCheck._id)
                    .then((check) => {
                        assert.strictEqual(check.name, testCheck.name);
                        assert.strictEqual(check.description, testCheck.description);
                        assert.strictEqual(check.condition, testCheck.condition);
                        assert.strictEqual(check.sqlID, testCheck.sqlID);
                        assert.strictEqual(check.sqlStatement, testCheck.sqlStatement);
                        done();
                    })
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
                        assert.strictEqual(checks.length, 1);

                        Check.findById(testCheck._id)
                            .then((checkFromDb) => {
                                chai.assert.isNotTrue(checkFromDb.isActive);
                                done();
                            })
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

                        Check.findById(testCheck._id)
                            .then((checkFromDb) => {
                                chai.assert.isTrue(checkFromDb.isActive);
                                done();
                            })
                    })
            });
    });

    it('will not delete anything with a incorrect id', (done) => {
        chai.request(server)
            .delete(`/api/checks/doesnotexist`)
            .set('X-Access-Token', JWT)
            .end((err, res) => {
                res.should.have.status(404);
                Check.find()
                    .then((checks) => {
                        assert.strictEqual(checks.length, 1);

                        Check.findById(testCheck._id)
                            .then((checkFromDb) => {
                                chai.assert.isTrue(checkFromDb.isActive);
                                done();
                            })
                    })
            });
    });
});