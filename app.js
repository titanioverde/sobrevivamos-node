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

app.get("/redget", function(req, res) {
	var result = client.get("gundams:dragon", function (err, replies) {
		res.json(replies);
	});
});

app.get("/controls", function(req, res) {
	res.render("town-controls", {town_id: 1});
});

app.get("/get_json/:town_id", function(req, res) {
	var result = client.get("towns:" + req.params.town_id, function (err, replies) {
		var town = JSON.parse(replies);
		res.json(town);
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
					res.json(new_town.contents);
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
				var for_web = {"town": new_town.contents, "output": output};
				res.json(for_web);
			});
		});
	});
});

http.createServer(app).listen(8080);