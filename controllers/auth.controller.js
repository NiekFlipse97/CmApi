const auth = require('../config/authorization')
const User = require('../models/user')
const Errors = require('../errorHandling/errorcodes')
const bcrypt = require('bcrypt')

function login(req, res) {
    let username = req.body.username || ''
    let password = req.body.password || ''

    User.findOne({ username: username, password: password })
        .then(user => {
            console.log(password + " ....... " + user.password)
            //     bcrypt.compare(password, user.password)
            //         .then(match => {
            //             if(!match) return res.status(401).json(Errors.unauthorized())

            //             token = auth.encodeToken(user._id)
            //             res.status(200).json({token: token})

            //         })
            //         .catch(err => {
            //             res.status(401).json(err)
            //         })

            // })
            token = auth.encodeToken(user._id)
            res.status(200).json({ token: token })
        })
        .catch(err => {
            res.status(401).json(Errors.unauthorized())
        })
}

module.exports = {
    login
}