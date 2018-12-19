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

    it('can get checks', (done) => {
        let testCheck2 = new Check({name: "testName2", description: "testDescription2", condition: 'MerchantAmount: 0',
            sqlStatement: 'SELECT "Payments".* FROM "Payments" WHERE "Payments"."MerchantAmount" = 0'});
        testCheck2.save()
            .then(() => {
                chai.request(server)
                    .get('/checks')
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
});