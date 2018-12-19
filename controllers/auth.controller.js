const auth = require('../config/authorization')
const User = require('../models/user')
const Errors = require('../errorHandling/errorcodes')

function login(req, res) {
    let username = req.body.username || ''
    let password = req.body.password || ''

    User.findOne({ username: username })
        .then((user) => {
            if (user.password == password) {
                let token = auth.encodeToken(user._id)
                res.status(200).json(token).end()
            } else {
                let err = Errors.unauthorized()
                res.status(err.code).json(err).end()
            }
        })
        .catch((error) => {
            let err = Errors.notFound()
            res.status(err.code).json(err).end()
        })
}

module.exports = {
    login
}