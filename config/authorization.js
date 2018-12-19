const config = require('../config/config.json');
const moment = require('moment');
const jwt = require('jwt-simple');

//
// Encode (van username naar token)
//
function encodeToken(username) {
    const payload = {
        exp: moment().add(10, 'days').unix(),
        iat: moment().unix(),
        sub: username
    };
    return jwt.encode(payload, config.secret)
}

//
// Decode (van token naar username)
//
function decodeToken(token, cb) {

    try {
        const payload = jwt.decode(token, config.secret)
        const now = moment().unix()

        // Check if the token has expired
        if (now > payload.exp) {
            console.log('Token has expired.')
        }
        return payload
    } catch(err) {
        console.log(err)
    }
}

module.exports = {
    encodeToken,
    decodeToken
}