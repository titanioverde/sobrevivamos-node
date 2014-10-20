//Pues Sobrevivamos / Then Let's Survive API

//Static path. Provisional.
var cwd = "/home/titanioverde/sobrevivamos-node/";

//Node.js modules
var http = require("http");
var express = require("express");
var bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
var session = require("express-session");
var redis = require("redis");
var RedisStore = require("connect-redis")(session);
var client = redis.createClient();

//The game core
var sobrevivamos = require(cwd + "sobrevivamos");

//Everything for Express framework
var app = express();
app.use(express.static(cwd + "static"));
app.use(bodyParser());
app.use(cookieParser());
app.use(session({ secret: "Zas!!", store: new RedisStore() }));
//app.use(passport.initialize());
app.set("view engine", "jade");
app.set("views", cwd + "views");
app.use(app.router);


//Provisional sessions
var cookieRead = function(req, res) {
	var sessionID = 0;
	if (!(req.cookies["sobrevivamos.session"])) {
		sessionID = "s" + Math.round(Math.random() * 1000000);
		res.cookie("sobrevivamos.session", sessionID);
	} else {
		sessionID = req.cookies["sobrevivamos.session"];
	}
	return sessionID;
}

//Login
//passport.use(new LocalStrategy(
//	function(username, password, done) {
//		client.hexists("users:" + username, "password", function (err, user) {
//			if (err) { return done(err); }
//			if (!user) { return done(null, false); }
//			client.hget("users:" + username, "password", function (err, pass) {
//				if (pass != password) { return done(null, false); }
//				else return done(null, user);
//			});
//		});
//	}
//));
//ToDo: session functions and login post. Follow NPM page and examples.

//Converts a report array to a formatted string.
var reportFromList = function(array, number) {
	var result = "Week " + number + " - ";
	for (var i in array) {
		result = result + array[i] + " ";
	}
	result += "<br />";
	return result;
}

var testSession = function(req, res) {
	if (req.session.count) {
		req.session.count += 1;
	} else {
		req.session.count = 1;
	}
	console.log(req.session.count);
}

//Game controls. The most usual page.
app.get("/controls_:town_id", function(req, res) {
	var sessionID = cookieRead(req, res);
	var result = client.get("towns:" + req.params.town_id, function (err, replies) {
		var contents = JSON.parse(replies);
		if ((contents.owner) && (contents.owner != req.cookies["sobrevivamos.session"])) {
			res.send("You're not allowed to enter this town.")
		} else {
			res.render("town-controls", {town_id: req.params.town_id});
		}
	});
	testSession(req, res);
});

//Get the town stringed JSON object from Redis, recover its JSON shape and send it to the client.
app.get("/get_json/:town_id", function(req, res) {
	var result = client.get("towns:" + req.params.town_id, function (err, replies) {
		var contents = JSON.parse(replies);
		var result2 = client.lrange("town" + req.params.town_id, 0, 2, function (err, replies) {
			var reports = replies;
			client.ltrim("town" + req.params.town_id, 0, 2);
			var town = {"contents": contents, "reports": reports};
			res.json(town);
		});
	});
});

//Receive set options and workers values from the client and process them through sobrevivamos.js.
//If there's no problem nor error, one game week will pass and the client will receive new town JSON info.
app.post("/send", bodyParser(), function(req, res) {
	var workers = req.body;
	var result = client.get("towns:" + workers["town_id"], function (err, replies) {
		var town = JSON.parse(replies);
		for (var worker in workers) {
			if (worker !== "name") { //I can't remember right now the reason behind this check...
				town[worker] = parseInt(workers[worker]);
			} else {
				town[worker] = workers[worker];
			}			
		}
		
		var new_town = new sobrevivamos.Town(town);
		new_town.endTurn(function() {
			var change = client.set("towns:" + workers["town_id"], JSON.stringify(new_town.contents), function (err, replies) {
				if (replies == "OK") {
					var textReports = reportFromList(new_town.reports, new_town.contents.week);
					var change2 = client.lpush("town" + workers["town_id"], textReports, function (err, replies) {
						res.send(200); //HTTP status must be enough for client to ask again for /get_json
					});
					
				}
			});
		});
	});
});

//Immediate effect for current town.
app.get("/killSheep/:town_id", function(req, res) {
	client.get("towns:" + req.params.town_id, function (err, replies) {
		var town = JSON.parse(replies);
		var new_town = new sobrevivamos.Town(town);
		new_town.killSheep(function(output) {
			var change = client.set("towns:" + req.params.town_id, JSON.stringify(new_town.contents), function (err, replies) {
				res.send(output);
			});
		});
	});
});

//Generate a new Redis "towns:" string with initial values.
//ToDo: difficulties
app.get("/new_town", function(req, res) {
	var sessionID = cookieRead(req, res);
	var next_id;
	client.get("next_id", function(err, replies) {
		next_id = replies;
		console.log(next_id);
		//ToDo: start next_id if (nil)
		var change = client.set("towns:" + next_id, '{"owner": "' + sessionID + '", "difficulty": 1, "week": 1, "inhabitants": 8, "sheeps": 2, "food": 50, "structure": 80, "safety": 15, "garbage": 15, "baseSafety": 15, "extraSafety": 8, "gatherers": 0, "builders": 0, "defenders": 0, "cleaners": 0, "weeksWithoutDisaster": 12, "gameOver": 0 }', function(err, replies) {
			if (err) throw (err);
			else {
				var new_id = client.set("next_id", parseInt(next_id) + 1);
				res.send("Town " + next_id + " generated. http://localhost:8080/controls/" + next_id); //Provisional
			}
		});
	});
});


app.get("/login", function(req, res) {
	res.render("login");
});

//I wonder if I'll need a better server for productivity.
http.createServer(app).listen(8080);