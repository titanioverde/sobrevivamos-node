var town = {};
var reports = "";
var main_jobs = ["gatherers", "builders", "defenders", "cleaners"],
	main_resources = ["food", "structure", "safety", "garbage"];

function refreshSpan(namey, town) {
	$("span#" + namey).text(town[namey]);
} //namey = every updatable stats span, to search by element id.

//For number inputs.
//ToDo: must use when loading page.
function refreshForm(town) {
	for (var job in main_jobs) {
		job_name = main_jobs[job];
		target = "input[name=" + job_name + "]";
		$(target)[0].value = town[job_name] | 0;
		$(target)[0].min = 0;
	}
	if (town["allowForeigners"]) {
		$("input[name=allowForeigners]").prop("checked", true);
	} else {
		$("input[name=allowForeigners]").prop("checked", false);
	}
	$("input[type=number]").trigger("touchspin.updatesettings", { max: town["inhabitants"] });
}

//Show current values. Grabbed from town local object
function refreshEverything(town, reports) {
	refreshSpan("week", town);
	refreshSpan("inhabitants", town);
	refreshForm(town);
	refreshIdles(town);
	refreshSpan("sheeps", town);
	if (town.score > 0) {
		refreshSpan("score", town);
	} else { //Sorry. I haven't figured yet how to calculate score while creating a town, and not later.
		$.ajax("/calculateScore/" + ($("#town_id").attr("value")), {
			type: "get",
			success: function(data) {
				town.score = data.score;
				refreshSpan("score", town);
			}
		});
	}
	
	for (var resource in main_resources) {
		refreshSpan(main_resources[resource], town);
	}
	refreshReports(reports);
	gameIsOver(town);
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

function gameIsOver(town) {
	if (town.gameOver) {
		$("button#killSheep").attr("disabled", "true");
		$("input#next_week").attr("disabled", "true");
		$("div#tryAgain").slideDown();
	}
}

//Send form values to Node server.
function nextWeek() {
	if (town.idles < 0) {
		$("span#idles").addClass("warning_fail");
		$("div#alertPeople").slideDown().delay(5000).slideUp();
		setTimeout(function() { $("span#idles").removeClass("warning_fail") }, 2100);
	} else {
		$.ajax("/send", {
			data: $("#mainForm").serialize(),
			type: "post",
			error: function(data, text, status) {
				$("#reports").html(text + " " + status);
			},
			statusCode: {
				404: function() {
					$("div#alertConnection").slideDown().delay(10000).slideUp();
				},
				500: function() {
					$("div#alertServer").slideDown().delat(10000).slideUp();
				}
			},
			beforeSend: function() {
				$("input").attr("disabled", "true");
			},
			success: function() {
				$("audio#sound-ticktock")[0].play();
				$("div#cover-animation").show().addClass("start-timeflows");
				setTimeout(function() {
					$("div#cover-animation").removeClass("start-timeflows").hide();
					$("audio#sound-bell")[0].play();
					getJSON($("input").removeAttr("disabled"));
					}, 4000);
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
		$.ajax("/killSheep/" + town_id, {
			data: "town_id=" + town_id,
			type: "get",
			beforeSend: function(data) {
				$("button#killSheep").attr("disabled", "disabled").addClass("active");
				$("input#next_week").attr("disabled", "disabled").addClass("active");
			},
			success: function(data) {
				var output = data;
				getJSON(function() {
					if (output.result == "success") {
						$("span#sheeps").addClass("warning_success");
					} else {
						$("span#sheeps").addClass("warning_fail");
						$("div#alertSheep").slideDown().delay(5000).slideUp();
					}
					$("button#killSheep").removeAttr("disabled").removeClass("active");
					$("input#next_week").removeAttr("disabled").removeClass("active");
	
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
	$("button#next_week").off("click").on("click", function(event) { event.preventDefault(); refreshIdles(town); nextWeek(); });
	$("button#killSheep").off("click").on("click", function(event) { event.preventDefault(); killSheep(); });
	$("input[type=number]").on("change", function(event) { refreshIdles(town); }).on("keyup", function(event) { refreshIdles(town) });
	$('[data-toggle="popover"]').popover();
	$("div#reports-expand").off("click").on("click", function(event) {
		event.preventDefault();
		if ($("div#reports-frame").hasClass("reports-expanding")) {
			$("div#reports-frame").removeClass("reports-expanding").removeClass("reports-expanded").addClass("reports-collapsing").addClass("reports-small");
			$("div#reports-expand").removeClass("glyphicon-resize-small").addClass("glyphicon-resize-full");
		} else {
			$("div#reports-frame").removeClass("reports-collapsing").removeClass("reports-small").addClass("reports-expanding").addClass("reports-expanded");
			$("div#reports-expand").removeClass("glyphicon-resize-full").addClass("glyphicon-resize-small");
		}
		
	});
	
	$("input[type='number']").TouchSpin({
		min: 0,
		max: 100,
		step: 1,
		decimals: 0,
		maxboostedstep: 1
	});
	
	getJSON();

});