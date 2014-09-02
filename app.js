var cwd = "/home/titanioverde/sobrevivamos-node/";

var http = require("http");
var express = require("express");
var redis = require("redis");
var sobrevivamos = require(cwd + "sobrevivamos");


var app = express();
app.use(app.router);
app.use(express.static(cwd + "static"));
app.use(express.bodyParser());
app.set("view engine", "jade");
app.set("views", cwd + "views");

var client = redis.createClient();

var reportFromList = function(array, number) {
	var result = "Week " + number + " - ";
	for (var i in array) {
		result = result + array[i] + " ";
	}
	result += "<br />";
	return result;
}

app.get("/redget", function(req, res) {
	var result = client.get("gundams:dragon", function (err, replies) {
		res.json(replies);
	});
});

app.get("/controls_:town_id", function(req, res) {
	res.render("town-controls", {town_id: req.params.town_id});
});

app.get("/get_json/:town_id", function(req, res) {
	var result = client.get("towns:" + req.params.town_id, function (err, replies) {
		var contents = JSON.parse(replies);
		var result2 = client.lrange("town" + req.params.town_id, 0, 2, function (err, replies) {
			console.log(replies);
			var reports = replies;
			client.ltrim("town" + req.params.town_id, 0, 2);
			var town = {"contents": contents, "reports": reports};
			res.json(town);
		});
	});
});

app.post("/send", express.bodyParser(), function(req, res) {
	var workers = req.body;
	var result = client.get("towns:" + workers["town_id"], function (err, replies) {
		var town = JSON.parse(replies);
		for (var worker in workers) {
			if (worker !== "name") {
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
						res.send(200);
					});
					
				}
			});
		});
	});
});

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

//ToDo: difficulties
app.get("/new_town", function(req, res) {
	var next_id;
	client.get("next_id", function(err, replies) {
		next_id = replies;
		console.log(next_id);
		var change = client.set("towns:" + next_id, '{"difficulty": 1, "week": 1, "inhabitants": 8, "sheeps": 2, "food": 50, "structure": 80, "safety": 15, "garbage": 15, "baseSafety": 15, "extraSafety": 8, "gatherers": 0, "builders": 0, "defenders": 0, "cleaners": 0, "weeksWithoutDisaster": 12, "gameOver": 0}', function(err, replies) {
			if (err) throw (err);
			else {
				var new_id = client.set("next_id", parseInt(next_id) + 1);
				res.send("Town " + next_id + " generated. http://localhost:8080/controls/" + next_id);
			}
		});
	});
});

http.createServer(app).listen(8080);