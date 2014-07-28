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
			refreshEverything(town);
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
	$("input#next_week").off("click").on("click", function(event) { nextWeek(); event.preventDefault(); });

});