let routes = require('express').Router()
const controller = require('../controllers/check.controller')

routes.post('/', controller.createCheck)
routes.get('/', controller.getAllChecks)

module.exports = routes