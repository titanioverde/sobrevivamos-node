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
		$(target)[0].value = town[job_name];
		$(target)[0].min = 0;
		$(target)[0].max = town["inhabitants"];
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

function refreshIdles(town) {
	town.idles = town.inhabitants;
	for (var i in main_jobs) {
		var job = main_jobs[i];
		town[job] = $("input[name=" + job + "]")[0].value;
		town.idles -= town[job];
	}
	refreshSpan("idles", town);
}

function nextWeek() {
	if (town.idles < 0) {
		$("span#idles").addClass("warning_fail");
		setTimeout(function() { $("span#idles").removeClass("warning_fail") }, 3000);
	} else {
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
	
}

function killSheep() {
	town_id = $("#town_id").attr("value");
	$("span#sheeps").removeClass("warning_success warning_fail");
	$.ajax("killSheep/" + town_id, {
		data: "town_id=" + town_id,
		dataType: "json",
		type: "get",
		success: function(data) {
			var for_web = data;
			console.log(for_web);
			refreshEverything(for_web.town);
			if (for_web.output.result == "success") {
				$("span#sheeps").addClass("warning_success");
			} else {
				$("span#sheeps").addClass("warning_fail");
			}
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
	$("input#next_week").off("click").on("click", function(event) { event.preventDefault(); refreshIdles(town); nextWeek(); });
	$("button#killSheep").off("click").on("click", function(event) { event.preventDefault(); killSheep(); });
	$("input[type=number]").on("change", function(event) { refreshIdles(town); }).on("keyup", function(event) { refreshIdles(town) });

});