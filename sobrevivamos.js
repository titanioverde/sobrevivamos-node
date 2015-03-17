//Pues Sobrevivamos / Then Let's Survive
//Game core class and procedures.

exports.Town = function(town) {
	this.contents = {
		//Important current attributes
		"owner": town.owner,
		"difficulty": town.difficulty | 1,
		"week": town.week | 0,
		"score": town.score | 0,
		"inhabitants": town.inhabitants | 0,
		"sheeps": town.sheeps | 0,
		"food": town.food | 0,
		"structure": town.structure | 0,
		"baseSafety": town.baseSafety | 0,
		"extraSafety": town.extraSafety | 0,
		"safety": town.safety | 0,
		"garbage": town.garbage | 0,
		"gatherers": town.gatherers | 0,
		"builders": town.builders | 0,
		"defenders": town.defenders | 0,
		"cleaners": town.cleaners | 0,
		"idles": town.idles | 0,
		
		//Disaster statistics
		"weeksWithoutDisaster": town.weeksWithoutDisaster,
		"nextDisaster": town.nextDisaster | 0,
		
		//Options
		"allowForeigners": town.allowForeigners | false,
		
		//Historic attributes
		"gameOver": town.gameOver | 0,
		"deaths": town.deaths | 0,
		"births": town.births | 0,
		"immigrants": town.immigrants | 0,
		"emigrants": town.emigrants | 0
	}
	
	this.statistics = [];
	this.reports = [];
	this.disasterList = ["Storm"];
	
	
	this.posi = function(property) {
		if (this.contents[property] < 0) {
			this.contents[property] = 0;
		}
		this.contents[property] = parseInt(this.contents[property]);
	}
	
	//Just to calculate inhabitants with no job assigned.
	this.howManyIdles = function() {
		var idles = (this.contents["inhabitants"] -
					 this.contents["gatherers"] -
					 this.contents["builders"] -
					 this.contents["defenders"] -
					 this.contents["cleaners"]);
		this.contents["idles"] = idles;
		return idles;
	}
	
	//Random food amount obtained from sheeps, one dice per sheep.
	this.milkFromSheeps = function() {
		var milk = 0;
		for (var sheep; sheep = 0; sheep < this.contents["sheeps"]) {
			milk += Math.round(Math.random() * 4);
		}
		this.contents["food"] += milk;
		return milk;
	}
	
	//Static profit from Gatherers. Little bonus when there are 10 or more of them.
	this.gatherersWork = function() {
		var food = this.contents["gatherers"] * 6;
		if (this.contents["gatherers"] >= 10) {
			food += 10;
		}
		this.contents["food"] += food;
		return food;
	}
	
	//Static profit from Builders.
	this.buildersWork = function() {
		var structure = this.contents["builders"] * 2;
		this.contents["structure"] += structure;
		return structure;
	}
	
	//Static and permanent profit from Defenders.
	this.defendersEnhance = function() {
		var safety = this.contents["defenders"];
		this.contents["baseSafety"] += safety;
		return safety;
	}
	
	//Extra value from current Defenders and bonus from Structure.
	this.addedSafety = function() {
		var safety = (this.contents["defenders"] * 5) + (this.contents["structure"] / 10);
		this.contents["extraSafety"] = safety;
		this.posi("extraSafety");
		return safety;
	}
	
	//Whole Safety value.
	this.wholeSafety = function() {
		var safety = (this.contents["baseSafety"] + this.contents["extraSafety"]);
		this.contents["safety"] = safety;
		return safety;
	}
	
	//Static profit from Cleaners.
	//Caution: The return value goes positive!
	this.cleanersWork = function() {
		var garbageRemoved = this.contents["cleaners"] * 7;
		this.contents["garbage"] -= garbageRemoved;
		this.posi("garbage");
		return garbageRemoved;
	}
	
	//Static food consumed in a turn.
	this.foodEaten = function() {
		console.log(this.contents);
		var food = ((this.contents["builders"] +
					 this.contents["defenders"] +
					 this.contents["cleaners"]) * 3) +
					 (this.contents["idles"] * 2);
		this.contents["food"] -= food;
		return food;
	}
	
	//Static structure requirement for the current crowd.
	this.structureNeeded = function() {
		var structure = (this.contents["inhabitants"] * 6) + this.contents["sheeps"];
		return structure;
	}
	
	//Static contamination per turn. Proportional bonus if very populated.
	this.garbageProduced = function() {
		var garbage = ((this.contents["gatherers"] +
						this.contents["defenders"]) * 2) +
						(this.contents["builders"] * 3) +
						this.contents["sheeps"] + this.contents["idles"];
		garbage = garbage + (Math.round(this.contents["inhabitants"] / 15) * 4);
		this.contents["garbage"] += garbage;
		return garbage;
	}
	
	//Deaths due to insufficient Structure. One of each for now.
	this.deathsByStructure = function() {
		if (this.structureNeeded() > this.contents["structure"]) {
			var inhabitants = 0,
				sheeps = 0;
			
			if (Math.random() > 0.5) {
				inhabitants++;
			}
			
			if ((this.contents["sheeps"] > 0) && (Math.random() > 0.8)) {
				sheeps++;
			}
			
			this.contents["inhabitants"] -= inhabitants;
			this.posi("inhabitants");
			this.contents["deaths"] += inhabitants;
			this.contents["sheeps"] -= sheeps;
			this.posi("sheeps");
			
			this.addReport("Dead inhabitants by pulmony", inhabitants);
			this.addReport("Dead sheeps by pulmony", sheeps);
			
			return [inhabitants, sheeps];
		} else {
			return [0, 0];
		}
	}
	
	//Death due to insufficient Food.
	this.deathByHunger = function() {
		if (this.contents["food"] < 0) {
			this.posi("food");
			var inhabitants = 0;
			for (var death = 0; death < (this.contents["inhabitants"] / 3); death++) {
				if (Math.random() > 0.2) {
					inhabitants++;
				}
			}
			
			this.contents["inhabitants"] -= inhabitants;
			this.posi("inhabitants");
			this.contents["deaths"] += inhabitants;
			this.addReport("Dead inhabitants by hunger", inhabitants);
			return inhabitants;
		} else {
			return 0;
		}
	}
	
	//Losses from a considerable level of Garbage.
	this.lossesByGarbage = function() {
		if (this.contents["garbage"] > 40) {
			var structure = Math.round(this.contents["structure"] / 20);
			var food = Math.round(this.contents["food"] / 10);
			
			this.contents["food"] -= food;
			this.posi("food");
			this.contents["structure"] -= structure;
			this.posi("structure");
			
			this.reports.push("Food and structure slightly damaged due to contamination.");
			return [food, structure];
		} else {
			return [0, 0];
		}
	}
	
	//Deaths from a dangerous level of Garbage. Only one for now.
	this.deathByGarbage = function() {
		if (this.contents["garbage"] > 80) {
			var inhabitants = 1;
			this.contents["inhabitants"] -= inhabitants;
			this.posi("inhabitants");
			this.contents["deaths"] += inhabitants;
			
			this.addReport("Dead inhabitants by high contamination", inhabitants);
			return inhabitants;
		} else {
			return 0;
		}
	}
	
	//Flees due to a low level of Safety. Only one for now.
	this.fleesBySafety = function() {
		if ((this.contents["safety"] < 10) && (this.contents["inhabitants"] > 6)) {
			var inhabitants = 1; //ToDo: Random calc.
			this.contents["inhabitants"] -= inhabitants;
			this.posi("inhabitants");
			
			this.addReport("Fled inhabitants due to lack of safety", inhabitants);
			return inhabitants;
		} else {
			return 0;
		}
	}
	//Random number of inhabitants born in a week, based on idles amount.
	this.inhabitantBirths = function() {
		if (this.contents["idles"] <= 1) {
			return 0;
		} else {			
			var births = 0;
			for (var encounter = 0; encounter < ((this.contents["idles"] / 4) + 1); encounter++) {
				if (Math.random() > 0.5) {
					births++;
				}
			}
			
			this.contents["inhabitants"] += births;
			this.contents["births"] += births;
			this.addReport("Newborn inhabitants", births);
			return births;
		}
		
		
	}
	

	//Random number of sheeps born. No more than 5 sheeps per week.
	this.sheepBirths = function() {
		if (this.contents["sheeps"] <= 1) {
			return 0
		}
		
		var births = 0;
		for (var encounter = 0; encounter < (this.contents["sheeps"] / 2); encounter++) {
			if ((Math.random() > 0.7) && (births <= 5)) {
				births++;
			}
		}
		
		this.contents["sheeps"] += births;
		this.addReport("Newborn sheeps", births);
		return births;
	}
	

	
	//Incoming people because of a high level of Safety.
	this.immigrantsBySafety = function() {
		if (this.contents["safety"] > 50) {
			var immigrants = 0;
			for (var incoming = 0; incoming < Math.round(this.contents["safety"] / 25) - 1; incoming++) {
				if (Math.random() > 0.66) {
					immigrants++;
				}
			}
			if (immigrants > 0) {
				if (this.contents["allowForeigners"]) {
					this.contents["inhabitants"] += immigrants;
					this.contents["immigrants"] += immigrants;
					
					this.addReport("Incoming immigrants", immigrants);
					return immigrants;
				} else {
					this.addReport("Some foreigners trying to enter were kicked out");
					return 0;
				}	
			} else {
				return 0;
			}
		} else {
			return 0;
		}
	}
	
	//Adds a little format to reports and pushes to an array.
	this.addReport = function(text, number) {
		if (typeof(number) == "number") {
			if (number > 0) {
				this.reports.push(text + ": " + number + ".");
			}
		}
		else {
			this.reports.push(text + ".");
		}
	}
	
	this.finishReport = function() {
		if (this.reports.length < 1) {
			this.addReport("Time flows away..");
		}
	}
	
	this.aNewWeek = function() {
		this.contents["week"]++;
		return this.contents["week"];
	}
	
	this.gameIsOver = function() {
		//One or less inhabitants with no safety.
		if ((this.contents["inhabitants"] <= 1) && (this.contents["safety"] < 50)) {
			this.addReport("People has disappeared. No one will born, and no one will come. This is no longer a town");
			this.contents["gameOver"] = 1;
		}
		
		//100% garbage
		if (this.contents["garbage"] >= 100) {
			this.addReport("The contamination in this town has reached lethal levels. No living being can remain here");
			this.contents["gameOver"] = 1;
		}
		
		//52 weeks passed. Happy ending.
		if ((this.contents["week"] >= 52) && (this.contents["gameOver"] == 0)) {
			this.addReport("One year has already passed since you arrived here. You did a good job bringing hope to them, so they can continue growing by themselves. Now you should walk away, looking for more survivors who need your help");
			this.contents["gameOver"] = 1;
		}
	}
	
	//Checks counter of weeks before a disaster. If 1, warning for next week. If 0, calls upon disaster and resets counter.
	this.disasterComing = function() {
		this.contents["weeksWithoutDisaster"]--;
		var weeks = this.contents["weeksWithoutDisaster"];
		
		var result = [];
		if (weeks == 1) {
			this.addReport("A " + this.disasterList[this.contents["nextDisaster"]] + " is approaching. We shall get protected");
		}
		if (weeks == 0) {
			switch (this.contents["nextDisaster"]) {
				case 0:
					result = this.disasterStorm();
					break;
				
				default:
					break;
			}
			this.wholeSafety();
			
		}
		
		if (weeks <= 0) {
			this.contents["weeksWithoutDisaster"] = parseInt(7 + (Math.random() * 5) - (this.contents["difficulty"]));
		}
		
		return result;
	}
	
	//When a storm has come. Returned values will be deducted from town.
	this.disasterStorm = function() {
		var inhabitants = 0,
			structure = 0,
			safety = 0,
			result = undefined;
		
		if (this.contents["safety"] >= 20) {
			safety = 10;
			this.contents["baseSafety"] -= safety;
			this.posi(["safety"]);
			this.addReport("A storm fell here. Your town was safe enough to prevent significant damages");
			result = "safe";
		} else {
			this.contents["baseSafety"] = 0;
			inhabitants = Math.round((this.contents["inhabitants"] / 10) + (Math.random() * 3));
			structure = 20;
			if (inhabitants > this.contents["inhabitants"]) inhabitants = this.contents["inhabitants"]; //ToDo: control this globally. Else, there would be more bodies than inhabitants. ^_^u
			this.addReport("A storm fell here. Structure damaged. Dead inhabitants", inhabitants);
			result = "bad";
		}
		
		this.contents["inhabitants"] -= inhabitants;
		this.posi(["inhabitants"]);
		this.contents["structure"] -= structure;
		this.posi(["structure"]);
		return [result, inhabitants, structure, safety];
	}
	
	//From here: functions with callback. (May I consider them my first "API"? (>Implying P4 Fridge Jokes had no API at all))
	
	//Manually butchering a sheep for a profit.
	this.killSheep = function(callback) {
		var output = {
			"food": 0,
			"safety": 0,
			"garbage": 0,
			"result": "unavailable"
		};
		if (this.contents["sheeps"] > 0) {
			this.contents["sheeps"] -= 1;
			
			if (Math.random() < 0.15) {
				output.garbage = 10;
				output.result = "sick";
			} else {
				output.food = 15;
				output.safety = 5;
				output.result = "success";
			}
			
			this.contents["food"] += output.food;
			this.contents["baseSafety"] += output.safety;
			this.contents["garbage"] += output.garbage;
			this.wholeSafety();
			this.calculateScore();
		}
		callback(output);
	}
	
	//Sums up the global score of this town.
	//A callback is expected when score is calculated before the first turn.
	this.calculateScore = function(callback) {
		var score = (
			(this.contents["food"] * 2) +
			(this.contents["baseSafety"] * 3) +
			(this.contents["structure"] * 4) -
			(this.contents["garbage"] * 5) +
			(this.contents["immigrants"] * 40) +
			(this.contents["sheeps"] * 50) +
			(this.contents["births"] * 60) -
			(this.contents["deaths"] * 70)
		);
		this.contents["score"] = score;
		if (typeof(callback) == "function") callback(score);
		return score;
	}
	

	this.endTurn = function(callback) {
		if ((this.howManyIdles() >= 0) && (this.contents["gameOver"] == 0)) {
			with(this) {
				statistics.push(milkFromSheeps());
				statistics.push(gatherersWork());
				statistics.push(buildersWork());
				statistics.push(defendersEnhance());
				statistics.push(addedSafety());
				statistics.push(wholeSafety());
				statistics.push(fleesBySafety());
				statistics.push(foodEaten());
				statistics.push(structureNeeded());
				statistics.push(garbageProduced());
				statistics.push(cleanersWork());
				statistics.push(deathByHunger());
				statistics.push(deathsByStructure());
				statistics.push(deathByGarbage());
				statistics.push(lossesByGarbage());
				statistics.push(inhabitantBirths());
				statistics.push(sheepBirths());
				statistics.push(immigrantsBySafety());
				statistics.push(disasterComing());
				statistics.push(calculateScore());
				//statistics.push(aNewWeek());
				finishReport();
				contents["week"]++;
				gameIsOver();
			}
		}		
		
		console.log(this.statistics);
		callback();
		
	}
}