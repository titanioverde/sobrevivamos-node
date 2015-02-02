//Pues Sobrevivamos / Then Let's Survive API

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
var sobrevivamos = require("./sobrevivamos");

//Everything for Express framework
var app = express();
app.use(express.static("./static"));
app.use(bodyParser());
app.use(cookieParser());
app.use(session({ key: "sobrevivamos-session", cookie: {maxAge: 604801000}, secret: "Zas!!", store: new RedisStore() }));
//app.use(passport.initialize());
app.set("view engine", "jade");
app.set("views", "./views");
app.use(app.router);


var difficulties = {
	0: { "townType": "Novice", "difficulty": 0, "inhabitants": 12, "sheeps": 3, "food": 80, "structure": 100, "safety": 25, "garbage": 8, "baseSafety": 25, "extraSafety": 10, "weeksWithoutDisaster": 14 },
	1: { "townType": "Easy", "difficulty": 1, "inhabitants": 8, "sheeps": 2, "food": 50, "structure": 80, "safety": 15, "garbage": 15, "baseSafety": 15, "extraSafety": 8, "gatherers": 0, "builders": 0, "defenders": 0, "cleaners": 0, "weeksWithoutDisaster": 12 },
	5: { "townType": "Extreme", "difficulty": 5, "inhabitants": 2, "sheeps": 0, "food": 6, "structure": 12, "safety": 9, "garbage": 35, "baseSafety": 9, "extraSafety": 1, "weeksWithoutDisaster": 6 }
} //ToDo: Something is wrong with the food consumed.


//Converts a report array to a formatted string.
var reportFromList = function(array, number) {
	var result = "Week " + number + " - ";
	for (var i in array) {
		result = result + array[i] + " ";
	}
	result += "<br />";
	return result;
};

//A bit of security to forbid other users to modify current town.
var isYourTown = function(req, res, town) {
	if (town["owner"] != req.session.ownerID) {
		res.send(401);
		return 0;
	} else {
		return 1;
	}
}


//Game controls. The most usual page.
app.get("/controls_:town_id", function(req, res) {
	var sessionID = sessionRead(req, res);
	var result = client.get("towns:" + req.params.town_id, function (err, replies) {
		var contents = JSON.parse(replies);
		if ((contents.owner) && (contents.owner != sessionID)) {
			res.redirect("/view_" + req.params.town_id);
		} else {
			res.render("town-controls", {town_id: req.params.town_id});
		}
	});
});

//Read-only information about a town.
app.get("/view_:town_id", function(req, res) {
	var result = client.get("towns:" + req.params.town_id, function(err, replies) {
		var contents = JSON.parse(replies);
		res.render("town-readonly", {contents: contents});
	});
});

//Just a number of towns owned by current user. Later it will show more info.
app.get("/town_list", function(req, res) {
	var ownerID = sessionRead(req, res);
	var list = client.smembers("ownedBy:" + ownerID, function(err, replies) {
		if (err) {
			res.send(err);
		} else {
			if (replies.length > 0) {
				res.render("town-list", {towns: replies, ownerID: ownerID});
			} else {
				res.redirect("/new_town");
			}
		}
	});	
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
		if (isYourTown(req, res, town)) {
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
		}
	});
});

//Immediate effect for current town.
app.get("/killSheep/:town_id", function(req, res) {
	client.get("towns:" + req.params.town_id, function (err, replies) {
		var town = JSON.parse(replies);
		if (isYourTown(req, res, town)) {
			var new_town = new sobrevivamos.Town(town);
			new_town.killSheep(function(output) {
				var change = client.set("towns:" + req.params.town_id, JSON.stringify(new_town.contents), function (err, replies) {
					res.send(output);
				});
			});
		}
	});
});

app.get("/new_town", function(req, res) {
	var dif_list = Object.keys(difficulties);
	res.render("new-town", {dif_list: dif_list, difficulties: difficulties});
});

//Generate a new Redis "towns:" string with initial values.
//ToDo: difficulties
app.get("/new_town/:difficulty", function(req, res) {
	var sessionID = sessionRead(req, res);
	var next_id;
	var input = req.params.difficulty;
	if (!(difficulties.hasOwnProperty(input))) {
		res.send("Town type unknown.");
	} else {
		console.log(difficulties);
		difficulty = difficulties[input];
		console.log(difficulty);
		difficulty = JSON.stringify(difficulty);
		console.log(difficulty);
		difficulty = difficulty.replace(/[{}]/g, "");
		client.get("next_id", function(err, replies) {
			next_id = replies;
			//ToDo: start next_id if (nil)
			var change = client.set("towns:" + next_id, '{"owner": "' + sessionID +'", ' + difficulty + ', "week": 1, "gatherers": 0, "builders": 0, "defenders": 0, "cleaners": 0, "gameOver": 0 }', function(err, replies) {
				if (err) throw (err);
				else {
					var new_id = client.set("next_id", parseInt(next_id) + 1);
					console.log(client.sadd("ownedBy:" + sessionID, next_id));
					res.send("Town " + next_id + " generated. <a href='/controls_" + next_id + "'>Come in</a>."); //Provisional
				}
			});
		});

	}
});

var hasSpace = function (text) {
	return (text.indexOf(" ") + 1);
}

//Provisional sessions
var sessionRead = function (req, res, callback) {
	var ownerID = 0;	
	if (!(req.session.ownerID)) {
		ownerID = "s" + Math.round(Math.random() * 1000000);
		req.session.ownerID = ownerID;
	} else {
		ownerID = req.session.ownerID;
	}
	if (callback) {
		callback();
	}
	return ownerID;	
};


app.get("/signup", function(req, res) {
	res.render("signup", {message: "Please register."});
});


app.post("/signup", bodyParser(), function(req, res) {
	var username = req.body.username;
	var password = req.body.password;
	if (hasSpace(username)) {
		res.render("signup", {message: "No spaces in your user name, please."});
	} else {
		client.hexists("users:" + username, "password", function (err, user) {
			console.log(user);
			if (err) { res.render("signup", {message: "Database error."}); }
			if (user) { res.render("signup", {message: "User name already exists."}); }
			else {
				client.hset("users:" + username, "password", password, function(err, replies) {
					console.log(replies);
					if (err) {
						res.send(err);
					} else {
						res.send("Signed up! Now you can <a href='login'>log in</a>.");
					}
				});
			}
		});
	}
});


app.get("/login", function(req, res) {
	sessionRead(req, res, function() {
		res.render("login", {username: req.session.ownerID});
	});	
});

app.post("/login", bodyParser(), function(req, res) {
	var username = req.body.username;
	var password = req.body.password;
	client.hexists("users:" + username, "password", function (err, user) {
		if (err) { res.send("Login error"); }
		if (!user) { res.send("User unknown"); }
		client.hget("users:" + username, "password", function (err, pass) {
			if (pass != password) { res.send("Wrong password"); }
			else {
				req.session.ownerID = username;
				res.redirect("/town_list");
			};
		});
	});
});

app.get("/logout", function(req, res) {
	req.session.destroy(function() {
		res.send("Session closed.");
	});
});

//I wonder if I'll need a better server for productivity.
http.createServer(app).listen(8080);