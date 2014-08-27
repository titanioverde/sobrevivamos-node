var town = {};
var reports = "";
var main_jobs = ["gatherers", "builders", "defenders", "cleaners"],
	main_resources = ["food", "structure", "safety", "garbage"];

function refreshSpan(namey, town) {
	$("span#" + namey).text(town[namey]);
}

//For number inputs.
//ToDo: must use when loading page.
function refreshForm(town) {
	for (var job in main_jobs) {
		job_name = main_jobs[job];
		target = "input[name=" + job_name + "]";
		$(target)[0].value = town[job_name] | 0;
		$(target)[0].min = 0;
		$(target)[0].max = town["inhabitants"];
	}
}

//Show current values. Grabbed from town local object
function refreshEverything(town, reports) {
	refreshSpan("week", town);
	refreshSpan("inhabitants", town);
	refreshForm(town);
	refreshIdles(town);
	refreshSpan("sheeps", town);
	for (var resource in main_resources) {
		refreshSpan(main_resources[resource], town);
	}
	refreshReports(reports);
}

//Inhabitants - workers
function refreshIdles(town) {
	town.idles = town.inhabitants;
	for (var i in main_jobs) {
		var job = main_jobs[i];
		town[job] = $("input[name=" + job + "]")[0].value | 0;
		town.idles -= town[job];
	}
	refreshSpan("idles", town);
}

//Renders reports about town's last weeks.
function refreshReports(reports) {
	$("#reports").html(reports);
}

//Send form values to Node server.
function nextWeek() {
	if (town.idles < 0) {
		$("span#idles").addClass("warning_fail");
		setTimeout(function() { $("span#idles").removeClass("warning_fail") }, 2100);
	} else {
		$.ajax("/send", {
			data: $("#mainForm").serialize(),
			type: "post",
			error: function(data, text, status) {
				$("#reports").html(text + " " + status);
			},
			beforeSend: function() {
				$("input#next_week").attr("disabled", "true");
			},
			success: function() {
				getJSON($("input#next_week").removeAttr("disabled"));
			},
			
		});
	}
}

//Node function with the same name.
function killSheep() {
	if (town.sheeps <= 0) {
		$("span#sheeps").addClass("warning_fail");
		setTimeout(function() { $("span#sheeps").removeClass("warning_success warning_fail"); }, 2100);
	} else {
		town_id = $("#town_id").attr("value");
		$("span#sheeps").removeClass("warning_success warning_fail");
		$.ajax("killSheep/" + town_id, {
			data: "town_id=" + town_id,
			type: "get",
			beforeSend: function(data) {
				$("button#killSheep").attr("disabled", "true");
			},
			success: function(data) {
				var output = data;
				getJSON(function() {
					if (output.result == "success") {
						$("span#sheeps").addClass("warning_success");
					} else {
						$("span#sheeps").addClass("warning_fail");
					}
					$("button#killSheep").removeAttr("disabled");
	
				});
			}
		});
	}
}

//Get all info at every change.
function getJSON(callback) {
	town_id = $("#town_id").attr("value");
	calling = $.ajax("get_json/" + town_id, {		
		dataType: "json",
		success: function(data) {
			town = data.contents;
			reports = data.reports;
			console.log(town);
			refreshEverything(town, reports);
			if (typeof(callback) == "function") {
				callback();
			}
		}
	});
}


$(document).ready(function() {
	getJSON();
	$("input#next_week").off("click").on("click", function(event) { event.preventDefault(); refreshIdles(town); nextWeek(); });
	$("button#killSheep").off("click").on("click", function(event) { event.preventDefault(); killSheep(); });
	$("input[type=number]").on("change", function(event) { refreshIdles(town); }).on("keyup", function(event) { refreshIdles(town) });

});