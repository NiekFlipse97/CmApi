let routes = require('express').Router()
const controller = require('../controllers/check.controller')
const authorization = require('../config/authorization')

routes.use('/', authorization.authenticate)
routes.post('/', controller.createCheck)
routes.get('/', controller.getAllChecks)
routes.get('/:id', controller.getCheckById)
routes.delete('/:id', controller.deleteCheck)

module.exports = routes