const config = require('../config/config.json');
const moment = require('moment');
const jwt = require('jwt-simple');
const Errors = require('../errorHandling/errorcodes')
const User = require('../models/user');

//
// Encode (van username naar token)
//
function encodeToken(uid) {
    const payload = {
        exp: moment().add(10, 'days').unix(),
        iat: moment().unix(),
        sub: uid
    };
    return jwt.encode(payload, config.secret);
}

//
// Decode (van token naar username)
//
function decodeToken(token, cb) {
    try {
        const payload = jwt.decode(token, config.secret);

        // Check if the token has expired. To do: Trigger issue in db ..
        const now = moment().unix();

        // Check if the token has expired
        if (now > payload.exp) {
            console.log('Token has expired.')
        }

        // Return
        cb(null, payload);

    } catch(err) {
        cb(err, null);
    }
}

let authenticate = function(req, res, next) {
    let token = req.header('X-Access-Token');
    if(token === undefined || token === null || token == '') {
        res.status(401).json(Errors.unauthorized()).end();
        return;
    }
    //console.log("detoken = " + token);

    decodeToken(token, (err, payload) => {
        if(err) {
            //console.log("TOKEN AUTH ERROR = " + err);
            res.status(401).json(Errors.unauthorized()).end();
            return;
        }

        //console.log(payload.sub);
        User.findById(payload.sub)
            .then((user) => {
                res.locals.user = user;
                next();
            })
            .catch((err) => {
                res.status(401).json(Errors.unauthorized());
            });
    });
};

let tokenDecode = function(req)
{
    return new Promise(function (resolve, reject)
    {
        decodeToken(req.header('X-Access-Token'), function(err, payload)
        {
            if (err)
            {
                console.log('Error handler: ' + err.message);
                reject();
            }
            else
            {
                resolve(payload.sub);
            }
        });
    })
};


module.exports = {
    encodeToken,
    decodeToken,
    authenticate,
    tokenDecode
};