/**
 * Module dependencies.
 */

var express = require('express'),
    mongoose = require('mongoose'),
    bodyParser = require('body-parser'),
    netServer = require('net').Server(),
    apikeyModel = require('./models/apikeyModel'),
    alertModel = require('./models/alertModel');


//Alert Database
var db = mongoose.createConnection('mongodb://localhost/community-report');
var Alert = db.model('Alert', alertModel);

//Channel database
var apiDB = mongoose.createConnection('mongodb://localhost/community-report-apikeys');
var APIkey = apiDB.model('APIkey', apikeyModel);


//quick database clear used while development
/*
APIkey.remove({},function(err){
  console.log("Cleared Database")
});

Alert.remove({},function(err){
  console.log("Cleared Database")
});

*/

//expres setup
var app = express();
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(express.static('public/'));

//port
var port = 8089;
var socketPORT = 9000;

var alertRouter = express.Router(); //routes for the REST API
app.use('/api', alertRouter); //API routed to serveraddr:port/api


// SOCKET USER LIST MANAGEMENT
/*
    Magic. Do not touch.
*/
var userList = [];

function Client(socket, userList) {
    var address = socket.remoteAddr;
    var self = this;
    socket.on("end", function() {
        var index = userList.indexOf(self);
        userList.splice(index, 1);
        console.log('disconnected');
    });

    this.getSocket = function() {
        return socket;
    };

}


//runs when new users connects
netServer.on('connection', function(socket) {
    console.log("new user");
    userList.push(new Client(socket));
    //  socket.write("{'name':'warning','description':'test','lat':57.765,'long':12.1223,'severity':7,'radius':12.1}\r\n");
});



//REST API for Alert
alertRouter.route('/alert')
    .post(function(req, res) {
        var alert = new Alert(req.body); //get the POST data
        var apiquery = {};
        apiquery.apikey = alert.apikey;
        //console.log("\n\nAPI KEY is : "+alert.apikey);
        APIkey.find(apiquery, function(err, data) { //validate the alert message
            if (err) {
                console.log("Error reading DB");
                res.status(500).send(err);
            } else {
                if (data.length > 0) { //API key match
                    alert.timestamp = new Date().getTime(); //add timestamp to the received alert
                    alert.save(); //save the alert to database

                    //re-asseble all the data into a temp object as we should not broadcast the API keys of the users.
                    var temp = {
                        name: alert.name,
                        description: alert.description,
                        lat: alert.lat,
                        long: alert.long,
                        radius: alert.radius,
                        severity: alert.severity,
                        timestamp: alert.timestamp
                    };

                    //send alert message to all connected Clients
                    for (var user in userList) {
                        try {
                            userList[user].getSocket().write(JSON.stringify(temp) + "\r\n");
                            console.log(JSON.stringify(temp) + "\r\n");
                        } catch (err) {
                            console.log("Cannot Send alrt to USER!!\n\nError :" + err);
                        }
                    }
                    res.status(201).send("OK"); //return success report
                } else {
                    console.log("Varification Unsuccessful!!");
                    res.status(500).send("API Key does not match!")
                }
            }
        });

    })
    //Used to get the Alert messages stored in the database
    //for debugging purposes only!!
    .get(function(req, res) {
        var query = {};
        //security check to prevent unauthorized query
        /*if(req.query.location){
          query.location = req.query.location;
        }*/
        Alert.find(query, function(err, alerts) {
            if (err) {
                console.log("Error reading DB");
                res.status(500).send(err);
            } else
                res.json(alerts);
        });
    }); //end of ALERT API block



//API to register new organization and get API key
alertRouter.route('/register')
    .post(function(req, res) {
        var user = new APIkey(req.body); //contains organization information
        //console.log(req.body);
        var userAPI = (Math.random() * 1000000000).toFixed(); //generate 9digit random number to be used as an API key
        console.log("API KEY :" + userAPI + " assigned to " + user.channel_name);
        user.apikey = userAPI.toString();
        res.status(201).send(user.apikey); //send api key to the user
        user.save(); //save to database
    })
    //GET details about current registered Organizatons
    //for debugging purposes only!!
    .get(function(req, res) {
        APIkey.find(function(err, data) {
            if (err) {
                res.status(500).send(err);
            } else {
                res.status(200).send(data);
            }

        });

    }); //end of /register API block



//GET lists of Registered Channels
alertRouter.route('/channels')
    .get(function(req, res) {
        //console.log(req);
        APIkey.find(function(err, data) {
            if (err) {
                res.status(500).send("Error!!");
            } else {
                //console.log(data.__lookupGetter__.length);
                var temp = [];
                for (var i in data) {
                    //console.log(typeof(data[i]));
                    var tempObj = {
                            channel_name: data[i].channel_name,
                            type: data[i].type
                        }
                        //temp.push(data[i].channel_name);
                    temp.push(tempObj);
                }
                var js = {}
                js.channel = temp;
                res.status(200).send(js);
            }

        });
    });


//routes to specific page for convenience
/*
app.get('/register-form',function(req,res){
  res.sendFile('public/form.html');
});

app.get('/api-view',function(req,res){
  res.sendFile('public/api.html');
});

app.get('/post-alert', function(req, res) {
  res.sendFile('public/alert.html');
});
*/

//HTTP server
app.listen(port, function() {
    console.log('HTTP Server running on PORT ' + port);
});

//socket server
netServer.listen(socketPORT, function() {
    console.log('Socket server running on PORT ' + socketPORT);
});
