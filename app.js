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
var i18n = require("i18next");
var i18n_options = {
	getAsync: false,
	cookieName: "sobrevivamos-lang",
	preload: ["en", "es"],
	fallbackLng: "en",
	debug: true
}
i18n.init(i18n_options);
var tr = i18n.t;

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
app.use(i18n.handle);
app.use(app.router);
i18n.registerAppHelper(app);


var difficulties = {
	0: { "townType": "Novice", "difficulty": 0, "gameMode": "Simple","inhabitants": 12, "sheeps": 3, "food": 80, "structure": 100, "safety": 35, "garbage": 8, "baseSafety": 25, "extraSafety": 10, "weeksWithoutDisaster": 14 },
	1: { "townType": "Easy", "difficulty": 1, "gameMode": "Simple", "inhabitants": 8, "sheeps": 2, "food": 50, "structure": 80, "safety": 23, "garbage": 15, "baseSafety": 15, "extraSafety": 8, "weeksWithoutDisaster": 12 },
	2: { "townType": "Moderate", "difficulty": 2, "gameMode": "Simple", "inhabitants": 6, "sheeps": 1, "food": 35, "structure": 60, "safety": 16, "garbage": 20, "baseSafety": 10, "extraSafety": 6, "weeksWithoutDisaster": 10 },
	3: { "townType": "Hard", "difficulty": 3, "gameMode": "Simple", "inhabitants": 4, "sheeps": 0, "food": 18, "structure": 40, "safety": 9, "garbage": 25, "baseSafety": 5, "extraSafety": 4, "weeksWithoutDisaster": 9 },
	4: { "townType": "Mania", "difficulty": 4, "gameMode": "Simple", "inhabitants": 3, "sheeps": 0, "food": 12, "structure": 28, "safety": 4, "garbage": 30, "baseSafety": 2, "extraSafety": 2, "weeksWithoutDisaster": 8 },
	5: { "townType": "Extreme", "difficulty": 5, "gameMode": "Simple", "inhabitants": 2, "sheeps": 0, "food": 6, "structure": 12, "safety": 10, "garbage": 35, "baseSafety": 9, "extraSafety": 1, "weeksWithoutDisaster": 6 }
}

var isGuest = function(username) {
	return /s{1}\d{7}/.test(username);
}


//Converts a report array to a formatted string.
var reportFromList = function(array, number) {
	var result = tr("Week") + " " + number + " - ";
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

//To avoid exceptions from unexpected / non-existent towns. (Else, Node will just hang)
//I can put error renders / codes here in the future.
var thisTownExists = function(reply) { //reply from Redis query.
	if (([null, false, 0, "(nil)"]).indexOf(reply) >= 0) {
		return 0;
	} else {
		return 1;
	}
}

//Game controls. The most usual page.
var controls = app.get("/controls_:town_id", function(req, res) {
	var sessionID = sessionRead(req, res);
	var result = client.get("towns:" + req.params.town_id, function (err, replies) {
		if (thisTownExists(replies)) {
			var contents = JSON.parse(replies);
			if ((contents.owner) && (contents.owner != sessionID)) {
				res.redirect("/view_" + req.params.town_id);
			} else {
				res.render("town-controls", {town_id: req.params.town_id});
			}
		} else {
			res.status(404);
			res.render("town-non-existent");
		}
	});
});

//Read-only information about a town.
var view = app.get("/view_:town_id", function(req, res) {
	var result = client.get("towns:" + req.params.town_id, function(err, replies) {
		if (thisTownExists(replies)) {
			var contents = JSON.parse(replies);
			res.render("town-readonly", {contents: contents});
		} else {
			res.status(404);
			res.render("town-non-existent");
		}
	});
});

//Just a number of towns owned by current user. Later it will show more info.
var town_list_own = app.get("/town_list", function(req, res) {
	var ownerID = sessionRead(req, res);
	res.redirect("/town_list/" + ownerID);
});

//List of towns owned by this user.
var town_list = app.get("/town_list/:user", function(req, res) {
	var ownerID = req.params.user;
	var list = client.smembers("ownedBy:" + ownerID, function(err, replies) {
		if (err) {
			res.send(err);
		} else {
			if (replies.length > 0) {
				var guest = isGuest(ownerID);
				res.render("town-list", {towns: replies, ownerID: ownerID, guest: guest});
			} else {
				if (ownerID == sessionRead(req, res)) {
					res.redirect("/new_town");
				} else {
					res.send(404, tr("userUnknown"));
				}
			}
		}
	});	
});

//Get the town stringed JSON object from Redis, recover its JSON shape and send it to the client.
var get_json = app.get("/get_json/:town_id", function(req, res) {
	var result = client.get("towns:" + req.params.town_id, function (err, replies) {
		if (thisTownExists(replies)) {
			var contents = JSON.parse(replies);
			var result2 = client.lrange("town" + req.params.town_id, 0, 2, function (err, replies) {
				var reports = replies;
				client.ltrim("town" + req.params.town_id, 0, 2);
				var town = {"contents": contents, "reports": reports};
				res.json(town);
			});
		} else {
			res.send(404);
		}
	});
});

//Receive set options and workers values from the client and process them through sobrevivamos.js.
//If there's no problem nor error, one game week will pass and the client will receive new town JSON info.
var send = app.post("/send", bodyParser(), function(req, res) {
	var workers = req.body;
	if (workers["allowForeigners"] == undefined) {
		workers["allowForeigners"] = 0;
	} else {
		workers["allowForeigners"] = 1;
	} //jQuery... I do not comprehend.
	var result = client.get("towns:" + workers["town_id"], function (err, replies) {
		if (thisTownExists(replies)) {
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
		} else {
			res.send(404);
		}
	});
});

//Immediate effect for current town.
var killSheep = app.get("/killSheep/:town_id", function(req, res) {
	client.get("towns:" + req.params.town_id, function (err, replies) {
		if (thisTownExists(replies)) {
			var town = JSON.parse(replies);
			if (isYourTown(req, res, town)) {
				var new_town = new sobrevivamos.Town(town);
				new_town.killSheep(function(output) {
					var change = client.set("towns:" + req.params.town_id, JSON.stringify(new_town.contents), function (err, replies) {
						res.send(output);
					});
				});
			}
		} else {
			res.send(404);
		}
	});
});

var calculateScore = app.get("/calculateScore/:town_id", function(req, res) {
	client.get("towns:" + req.params.town_id, function (err, replies) {
		if (thisTownExists(replies)) {
			var town = JSON.parse(replies);
			if (isYourTown(req, res, town)) {
				var new_town = new sobrevivamos.Town(town);
				new_town.calculateScore(function(score) {
					var change = client.set("towns:" + req.params.town_id, JSON.stringify(new_town.contents), function(err, replies) {
						res.json({"score": score});
					});
				});
			}
		} else {
			res.send(404);
		}
	});
});

var new_town_own = app.get("/new_town", function(req, res) {
	var dif_list = Object.keys(difficulties);
	res.render("new-town", {dif_list: dif_list, difficulties: difficulties});
});

//Generate a new Redis "towns:" string with initial values.
var new_town = app.get("/new_town/:difficulty", function(req, res) {
	var sessionID = sessionRead(req, res);
	var next_id;
	var input = req.params.difficulty;
	if (!(difficulties.hasOwnProperty(input))) {
		res.send(404, tr("townTypeUnknown"));
	} else {
		difficulty = difficulties[input];
		difficulty = JSON.stringify(difficulty);
		difficulty = difficulty.replace(/[{}]/g, "");
		client.get("next_id", function(err, replies) {
			next_id = replies;
			if (!(next_id)) next_id = 1;
			var change = client.set("towns:" + next_id, '{"owner": "' + sessionID +'", ' + difficulty + ', "week": 1, "gatherers": 0, "builders": 0, "defenders": 0, "cleaners": 0, "gameOver": 0 }', function(err, replies) {
				if (err) throw (err);
				else {
					var new_id = client.set("next_id", parseInt(next_id) + 1);
					client.sadd("ownedBy:" + sessionID, next_id);
					res.render("town-generated", {next_id: next_id});
				}
			});
		});
	}
});

//No spaces in usernames, please.
var hasSpace = function (text) {
	return (text.indexOf(" ") + 1);
}

//Provisional sessions
var sessionRead = function (req, res, callback) {
	var ownerID = 0;	
	if (!(req.session.ownerID)) {
		ownerID = "s" + Math.round((Math.random() * 9000000) + 1000000);
		req.session.ownerID = ownerID;
	} else {
		ownerID = req.session.ownerID;
	}
	if (callback) {
		callback();
	}
	return ownerID;	
};

//Signup form
var signup_get = app.get("/signup", function(req, res) {
	res.render("signup", {message: tr("pleaseRegister")});
});

//Signup process
var signup_post = app.post("/signup", bodyParser(), function(req, res) {
	var body = req.body;
	if (hasSpace(body.username)) {
		res.render("signup", {message: "noSpaces"});
	} else {
		if (body.fullName == "") body.fullName = body.username;
		client.hexists("users:" + body.username, "password", function (err, user) {
			if (err) { res.render("signup", {message: tr("dbError")}); }
			if (user) { res.render("signup", {message: tr("existingUser")}); }
			else {
				client.hmset("users:" + body.username, "password", body.password,
							 "fullName", body.fullName, "email", body.email,
							 "bio", body.bio, "location", body.location,
							 "url", body.url, function(err, replies) {
					if (err) {
						res.send(500, err);
					} else {
						res.render("signup-done");
					}
				});
			}
		});
	}
});

//Login form
var login_get = app.get("/login", function(req, res) {
	sessionRead(req, res, function() {
		res.render("login", {username: req.session.ownerID});
	});	
});

//Login process
var login_post = app.post("/login", bodyParser(), function(req, res) {
	var username = req.body.username;
	var password = req.body.password;
	client.hexists("users:" + username, "password", function (err, user) {
		if (err) { res.send(500, tr("loginError") + err); }
		if (!user) { res.send(404, tr("userUnknown")); }
		client.hget("users:" + username, "password", function (err, pass) {
			if (pass != password) { res.send(tr("wrongPassword")); }
			else {
				req.session.ownerID = username;
				res.redirect("/town_list");
			};
		});
	});
});

var logout = app.get("/logout", function(req, res) {
	req.session.destroy(function() {
		res.send(tr("loggedOut"));
	});
});


var profile_own = app.get("/profile", function(req, res) {
	var userID = sessionRead(req, res);
	res.redirect("/profile/" + userID);
});

//Nice properties, towns and scores from any registered user.
var profile = app.get("/profile/:user", function(req, res) {
	var username = req.params.user;
	client.hexists("users:" + username, "password", function(err, result) {
		if (err) { res.send(500, tr("profileError") + err); }
		if (!result) { res.send(404, tr("userUnknown")); }
		client.hmget("users:" + username, "fullName", "bio", "location", "url", "lastTime", function(err, replies) {
			res.render("profile", {profile: replies, username: username});
		});
	});
});


var first_page = app.get("/", function (req, res) {
	res.render("first");
});

var lang_test = app.get("/lang", function (req, res) {
	res.send(tr("testring") + i18n.lng());
});

//I wonder if I'll need a better server for productivity.
http.createServer(app).listen(8080);