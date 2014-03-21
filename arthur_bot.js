/**
 * Just to show BigBot he should really place his bots randomly !
 */


	// Getting argument
	var input = JSON.parse(process.argv.slice(2));

	// Specific case for BigBot
	var fight_against_bigbot = false;
	var moves_for_bigbot = [
		"22", 
		"23", // Size 2 sunk ! 
		"53", 
		"54",
		"55", // Size 3 sunk !
		"47",
		"57",
		"67",
		"77", // Size 4 sunk ! 
		"00",
		"10",
		"20",
		"30",
		"40"  // Size 5 sunk !
	];


	// Variables for setup
	var ships = [5, 4, 3, 2];
	var boardSize = 8;
	var positions = [];

	// Variables for moves
	var probabilities = [];


	// Checking if we can assign a ship to a given position
	function shipCanOccupyPosition(criteriaForRejection, pos, shipSize, vertical) { 
		// "pos" is ship origin
		var x = pos[0],
		    y = pos[1],
		    z = (vertical ? y : x),
		    end = z + shipSize - 1;

		// board border is too close
		if (end > boardSize - 1) return false;

		// check if there's an obstacle
		for (var i = z; i <= end; i++) {
		    var thisPos = (vertical ? positions[x][i] : positions[i][y]);
		    if (thisPos === criteriaForRejection) return false;
		}

		return true;
	}


	// Distributing randomly the ships on the board
	function distributeShips() {
		var pos, shipPlaced, vertical, jsonData;
		var jsonMessage = {};

		// initialize positions matrix
		for (var y = 0; y < boardSize; y++) {
		    positions[y] = [];
		    for (var x = 0; x < boardSize; x++) {
		        positions[y][x] = null;
		    }
		}
	      
		function getRandomPosition() {
			var x = Math.floor(Math.random() * boardSize),
			    y = Math.floor(Math.random() * boardSize);

			return [x, y];
	   	 }

		function randomBoolean() {
			return (Math.round(Math.random()) == 1);
		}

		function placeShip(pos, shipSize, vertical) {
			// "pos" is ship origin
			var x = pos[0],
			    y = pos[1],
			    z = (vertical ? y : x),
			    end = z + shipSize - 1;

			if (shipCanOccupyPosition(0, pos, shipSize, vertical)) {
			    for (var i = z; i <= end; i++) {
				if (vertical) positions[x][i] = 0;
				else positions[i][y] = 0;
			    }
			    return true;
			}

			return false;
		    }

		for (var i = 0, l = ships.length; i < l; i++) {
		    jsonData = {};
		    shipPlaced = false;
		    vertical = randomBoolean();
		    while (!shipPlaced) {
		        pos = getRandomPosition();
		        shipPlaced = placeShip(pos, ships[i], vertical);
		    }
		    // Ship is placed, creating the json object
		    jsonData["point"] = pos[0].toString()+pos[1].toString();
		    jsonData["orientation"] = vertical ? "vertical" : "horizontal";
		    jsonMessage[(ships[i]).toString()] = jsonData;            
		}
		console.log(jsonMessage);
	}



	function parseInput(json) {
		// resetting positions
		for (var y = 0; y < boardSize; y++) {
		    positions[y] = [];
		    for (var x = 0; x < boardSize; x++) {
		        positions[y][x] = null;
		    }
		}
	
		// getting hit positions
		for (var i=0; i < json.hit.length; i++) {
			positions[Math.floor(json.hit[i] / 10)][ json.hit[i] % 10] = 2;
		}

		// getting missed positions
		for (var i=0; i < json.missed.length; i++) {
			positions[Math.floor(json.missed[i] / 10)][ json.missed[i] % 10] = 1;
		}
		//console.log(Math.floor(json.hit[6] / 10));
	}


	function recalculateProbabilities() {
		var hits = [];


		function increaseProbability(pos, shipSize, vertical) {
			// "pos" is ship origin
			var x = pos[0],
			    y = pos[1],
			    z = (vertical ? y : x),
			    end = z + shipSize - 1;

			for (var i = z; i <= end; i++) {
			    if (vertical) probabilities[x][i]++;
			    else probabilities[i][y]++;
			}
		}

		function skewProbabilityAroundHits(toSkew) {
			var uniques = [];

			function getAdjacentPositions(pos) {
				var x = pos[0],
				    y = pos[1],
				    adj = [];

				if (y + 1 < boardSize) adj.push([x, y + 1]);
				if (y - 1 >= 0) adj.push([x, y - 1]);
				if (x + 1 < boardSize) adj.push([x + 1, y]);
				if (x - 1 >= 0) adj.push([x - 1, y]);

				return adj;
			}

			// add adjacent positions to the positions to be skewed
			for (var i = 0, l = toSkew.length; i < l; i++) {
			    toSkew = toSkew.concat(getAdjacentPositions(toSkew[i]));
			}

			for (var i = 0, l = toSkew.length; i < l; i++) {
			    var uniquesStr = uniques.join('|').toString();
			    if (uniquesStr.indexOf(toSkew[i].toString()) === -1) {
				uniques.push(toSkew[i]);

				// skew probability
				var x = toSkew[i][0],
				    y = toSkew[i][1];
				probabilities[x][y] *= 2;
			    }
			}
		 }

		// reset probabilities
		for (var y = 0; y < boardSize; y++) {
		    probabilities[y] = [];
		    for (var x = 0; x < boardSize; x++) {
		        probabilities[y][x] = 0;
		        // we remember hits as we find them for skewing
		        if (positions[x][y] === 2) {
		            hits.push([x, y]);
		        }
		    }
		}

		// calculate probabilities for each type of ship
		for (var i = 0, l = ships.length; i < l; i++) {
		    for (var y = 0; y < boardSize; y++) {
		        for (var x = 0; x < boardSize; x++) {
		            // horizontal check
		            if (shipCanOccupyPosition(1, [x, y], ships[i], false)) {
		                increaseProbability([x, y], ships[i], false);
		            }
		            // vertical check
		            if (shipCanOccupyPosition(1, [x, y], ships[i], true)) {
		                increaseProbability([x, y], ships[i], true);
		            }
		        }
		    }
		}

		// skew probabilities for positions adjacent to hits
		skewProbabilityAroundHits(hits);

		//console.log(probabilities);
	}



        function getBestUnplayedPosition() {
		var bestProb = 0,
		    bestPos;

		for (var y = 0; y < boardSize; y++) {
		    for (var x = 0; x < boardSize; x++) {
		        if (!positions[x][y] && probabilities[x][y] > bestProb) {
		            bestProb = probabilities[x][y];
		            bestPos = [x, y];
		        }
		    }
		}

		var jsonData = {};
        	jsonData["move"] = bestPos[0].toString() + bestPos[1].toString();
		return jsonData;
	}





	/* Main loop ! (Finally) */
	if (input.cmd == "init") {
		// Creating a random config
		distributeShips();
	} else {
		if (fight_against_bigbot) {	
			// Checking which moves were played
			var index = 0;	
			while (input.hit.indexOf(moves_for_bigbot[index]) > -1 || input.missed.indexOf(moves_for_bigbot[index]) > -1) {
				index++;
			}
			// Playing recorded move
			console.log(JSON.stringify({
				move: moves_for_bigbot[index]
			}));
		} else {
			// That's the real game we are talking about !
			parseInput(input);
			recalculateProbabilities();
			console.log(JSON.stringify(getBestUnplayedPosition()));	
		}
	}

	process.exit(0);
