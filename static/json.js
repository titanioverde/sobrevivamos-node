var town = {};
var main_jobs = ["gatherers", "builders", "defenders", "cleaners"],
	main_resources = ["food", "structure", "safety", "garbage"];

function refreshSpan(namey, town) {
	$("span#" + namey).text(town[namey]);
}

function refreshForm(town) {
	for (var job in main_jobs) {
		job_name = main_jobs[job];
		target = "input[name=" + job_name + "]";
		$(target).attr("value", town[job_name]);
		$(target).attr("min", 0);
		$(target).attr("max", town["inhabitants"]);
	}
}

function refreshEverything(town) {
	refreshSpan("week", town);
	refreshSpan("inhabitants", town);
	refreshSpan("idles", town);
	refreshSpan("sheeps", town);
	for (var resource in main_resources) {
		refreshSpan(main_resources[resource], town);
	}
	refreshForm(town);
}

function nextWeek() {
	$.ajax("/send", {
		data: $("#mainForm").serialize(),
		type: "post",
		dataType: "json",
		success: function(data) {
			town = data;
			console.log(town);
			refreshEverything(town);
		}
	});
}

function killSheep() {
	town_id = $("#town_id").attr("value");
	$.ajax("killSheep/" + town_id, {
		data: "town_id=" + town_id,
		dataType: "json",
		type: "get",
		success: function(data) {
			var for_web = data;
			console.log(for_web);
			refreshEverything(for_web.town);
		}
	});
}

$(document).ready(function() {
	town_id = $("#town_id").attr("value");
	calling = $.ajax("get_json/" + town_id, {		
		dataType: "json",
		success: function(data) {
			town = data;
			console.log(town);
			refreshEverything(town);
		}
	});
	$("input#next_week").off("click").on("click", function(event) { event.preventDefault(); nextWeek(); });
	$("button#killSheep").off("click").on("click", function(event) { event.preventDefault(); killSheep(); })

});