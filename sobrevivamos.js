//Game core class and procedures.

exports.Town = function(town) {
	this.contents = {
		//Important current attributes
		"difficulty": town.difficulty | 1,
		"week": town.week | 0,
		"score": town.score | 0,
		"inhabitants": town.inhabitants | 0,
		"sheeps": town.sheeps | 0,
		"food": town.food | 0,
		"structure": town.structure | 0,
		"safety": town.safety | 0,
		"garbage": town.garbage | 0,
		"gatherers": town.gatherers | 0,
		"builders": town.builders | 0,
		"defenders": town.defenders | 0,
		"cleaners": town.cleaners | 0,
		"idles": town.idles | 0,
		"extraSafety": town.extraSafety | 0,
		
		//Options
		"allowForeigners": town.allowForeigners | false,
		
		//Historic attributes
		"deaths": town.deaths | 0,
		"births": town.births | 0,
		"immigrants": town.immigrants | 0,
		"emigrants": town.emigrants | 0
	}
	
	this.statistics = [];
	
	
	
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
		this.contents["safety"] += safety;
		return safety;
	}
	
	//Extra value from current Defenders and bonus from Structure.
	this.addedSafety = function() {
		var safety = (this.contents["defenders"] * 5) + (this.contents["structure"] / 10);
		this.contents["extraSafety"] = safety;
		this.posi("extraSafety");
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
		var food = ((this.contents["builders"] +
					 this.contents["defenders"] +
					 this.contents["cleaners"]) * 3) +
					 (this.contents["idles"] * 2);
		this.contents["food"] -= food;
		this.posi("food");
		return food;
	}
	
	//Static structure requirement for the current crowd.
	this.structureNeeded = function() {
		var structure = (this.contents["inhabitants"] * 2) + this.contents["sheeps"];
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
	
	//Random number of inhabitants born in a week, based on idles amount.
	this.inhabitantBirths = function() {
		if (this.contents["idles"] <= 1) {
			return 0;
		} else {			
			var births = 0;
			for (var encounter = 0; encounter < ((this.contents["idles"] / 4) + 1); encounter++) {
				console.log("Orgy!");
				if (Math.random() > 0.5) {
					births ++;
				}
			}
			
			this.contents["inhabitants"] += births;
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
		return births;
	}
	
	//Deaths due to insufficient Structure. One of each for now.
	this.deathsByStructure = function() {
		if (this.structureNeeded() > this.contents["structure"]) {
			var inhabitants = 0,
				sheeps = 0;
			
			if (Math.random() > 0.5) {
				inhabitants++;
			}
			
			if ((this.contents["sheeps"] > 0) && (Math.random() > 0.7)) {
				sheeps++;
			}
			
			this.contents["inhabitants"] -= inhabitants;
			this.posi("inhabitants");
			this.contents["deaths"] += inhabitants;
			this.contents["sheeps"] -= sheeps;
			this.posi("sheeps");
			return [inhabitants, sheeps];
		} else {
			return [0, 0];
		}
	}
	
	//Death due to insufficient Food.
	this.deathByHunger = function() {
		if (this.foodEaten() > this.contents["food"]) {
			var inhabitants = 0;
			for (var death = 0; death < (this.contents["inhabitants"] / 3); death++) {
				if (Math.random() > 0.2) {
					inhabitants++;
				}
			}
			
			this.contents["inhabitants"] -= inhabitants;
			this.posi("inhabitants");
			this.contents["deaths"] += inhabitants;
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
			return inhabitants;
		} else {
			return 0;
		}
	}
	
	//Flees due to a low level of Safety. Only one for now.
	this.fleesBySafety = function() {
		if (this.contents["safety"] < 10) {
			var inhabitants = 1;
			this.contents["inhabitants"] -= inhabitants;
			this.posi("inhabitants");
			return inhabitants;
		} else {
			return 0;
		}
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
			
			this.contents["inhabitants"] += immigrants;
			this.contents["immigrants"] += immigrants;
			return immigrants;
		} else {
			return 0;
		}
	}
	
	this.aNewWeek = function() {
		console.log(this.contents["week"]);
		this.contents["week"]++;
		return this.contents["week"];
	}
	
	//When a storm has come. Returned values will be deducted from town.
	this.disasterStorm = function() {
		var inhabitants = 0,
			structure = 0,
			safety = 0,
			result = undefined;
		
		if (this.contents["safety"] >= 50) {
			safety = 25;
			this.contents["safety"] -= safety;
			this.posi(["safety"]);
			result = "safe";
		} else {
			this.contents["safety"] = 0;
			inhabitants = 2 + Math.round(Math.random() * 3);
			structure = 20;
			result = "bad";
		}
		
		this.contents["inhabitants"] -= inhabitants;
		this.posi(["inhabitants"]);
		this.contents["structure"] -= structure;
		this.posi(["structure"]);
		return [result, inhabitants, structure, safety];
	}
	
	//Manually butching a sheep for a profit.
	this.killSheep = function() {
		if (this.contents["sheeps"] > 0) {
			this.contents["sheeps"] -= 1;
			var food = 0,
				safety = 0,
				garbage = 0,
				result = undefined;
			
			if (Math.random() < 0.15) {
				garbage = 10;
				result = "sick";
			} else {
				food = 15;
				safety = 5;
				result = "success";
			}
			
			this.contents["food"] += food;
			this.contents["safety"] += safety;
			this.contents["garbage"] += garbage;
			return [result, food, safety, garbage];
		} else {
			return ["unavailable", 0, 0, 0];
		}
	}
	
		
	//Now to think again how to flow.
	
	this.endTurn = function(callback) {
		if (this.howManyIdles() >= 0) {
			with(this) {
				statistics.push(milkFromSheeps());
				statistics.push(gatherersWork());
				statistics.push(buildersWork());
				statistics.push(defendersEnhance());
				statistics.push(addedSafety());
				statistics.push(deathByHunger());
				statistics.push(deathsByStructure());
				statistics.push(fleesBySafety());
				statistics.push(foodEaten());
				statistics.push(structureNeeded());
				statistics.push(garbageProduced());
				statistics.push(cleanersWork());
				statistics.push(deathByGarbage());
				statistics.push(inhabitantBirths());
				statistics.push(sheepBirths());
				statistics.push(immigrantsBySafety());
				//statistics.push(aNewWeek());
				contents["week"]++;
			}
		}
		
		
		console.log(this.statistics);
		callback();
		
	}
}