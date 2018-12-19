let routes = require('express').Router();
const CheckController = require('../controllers/check.controller');

routes.post('/checks', CheckController.createCheck);

module.exports = routes;