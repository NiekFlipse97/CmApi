let routes = require('express').Router()
const controller = require('../controllers/check.controller')

routes.post('/', controller.createCheck)
routes.get('/', controller.getAllChecks)
routes.get('/:id', controller.getCheckById)

module.exports = routes