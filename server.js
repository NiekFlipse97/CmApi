const express = require('express')
const bodyParser = require('body-parser')
const boxen = require('boxen');
const app = express()
const mongodb = require('./databases/mongoDatabase')
const CheckExecutor = require('./checkExecutor/CheckExecutor');
const sqlDb = require('./databases/sqlDatabase');

// Config
const config = require('./config/config.json')

// Startup log
console.log(boxen('CM API', {
    padding: {
        left: 20,
        right: 20,
        top: 1,
        bottom: 1
    },
    margin: 1,
    borderStyle: 'double'
}))

// Use
app.use(bodyParser.json())

//CORS
var cors = require('cors')
app.use(cors())

// Route files
const authRoutes = require('./routes/auth.routes')
const checkRoutes = require('./routes/check.routes')


app.all("*", function(req, res, next)
{
    console.log(req.method + " " + req.url);
    next();
});
// Routes
app.get('/', (req, res) => res.send('Welcome to the CM API!'))
app.use('/api/auth', authRoutes)
app.use('/api/checks', checkRoutes)




sqlDb.getConnection();
CheckExecutor.getAllChecks();
let isInTest = typeof global.it === 'function';
if(!isInTest) CheckExecutor.executeChecksOnInterval(5);

// Listen on port
var server = app.listen(process.env.PORT || config.port, function () {
    var host = server.address().address
    var port = server.address().port

    console.log("Express: Listening to Socket: http://localhost:" + port)
})

module.exports = {
    app
}