const express = require('express')
const bodyParser = require('body-parser')
const boxen = require('boxen');
const app = express()
const mongodb = require('./databases/mongodb')

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

// Route files
const checkRoutes = require('./routes/check.routes')


// Routes
app.get('/', (req, res) => res.send('Hello World!'))
app.use('/checks', checkRoutes)

// Catch 404's
// app.use('*', function (req, res) {
//     res.status('404').json(new NotFoundResponse(req.originalUrl)).end()
// })

// Listen on port
var server = app.listen(process.env.PORT || config.port, function () {
    var host = server.address().address
    var port = server.address().port

    console.log("Express: Listening to Socket: http://localhost:" + port)
})

module.exports = {
    app
}