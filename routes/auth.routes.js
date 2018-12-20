const routes = require('express').Router()
const controller = require('../controllers/auth.controller')

routes.post('/', controller.login)

module.exports = routes