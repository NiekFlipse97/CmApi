let routes = require('express').Router();
const CheckController = require('../controllers/check.controller');

routes.post('/', CheckController.createCheck);

module.exports = routes;