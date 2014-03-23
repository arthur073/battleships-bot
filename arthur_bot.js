/**
 * Arthur's bot.
 *
 * TODO:
 *  - better use of probabilities when boats start to be destroyed
 */


	// Getting argument
	var input = JSON.parse(process.argv.slice(2));

	// Specific case for Stab
	var fight_against_stab = true;
	var moves_for_stab = [
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
	var shipsDestroyed = [];


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
		console.log(JSON.stringify(jsonMessage));
	}



	function parseInput(json) {
		// resetting positions
		for (var y = 0; y < boardSize; y++) {
		    positions[y] = [];
		    for (var x = 0; x < boardSize; x++) {
		        positions[y][x] = null;
		    }
		}
		

		console.log(json.hit.length + json.missed.length);
	
		// getting hit positions
		for (var i=0; i < json.hit.length; i++) {
			positions[Math.floor(json.hit[i] / 10)][ json.hit[i] % 10] = 2;
		}

		// getting missed positions
		for (var i=0; i < json.missed.length; i++) {
			positions[Math.floor(json.missed[i] / 10)][ json.missed[i] % 10] = 1;
		}
		// getting destroyed ships
		for (var i=0; i < json.destroyed.length; i++) {
			shipsDestroyed.push(json.destroyed[i]);
		}

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


		// Checks if ship is not destroyed			
		function shipIsStillAlive(ship_size) {
		
			if (shipsDestroyed.indexOf(ship_size) > -1) {
				// The ship has been destroyed ! 
				return false;
			}		
			return true;
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
		            if (shipIsStillAlive(ships[i]) && shipCanOccupyPosition(1, [x, y], ships[i], false)) {
		                increaseProbability([x, y], ships[i], false);
		            }
		            // vertical check
		            if (shipIsStillAlive(ships[i]) && shipCanOccupyPosition(1, [x, y], ships[i], true)) {
		                increaseProbability([x, y], ships[i], true);
		            }
		        }
		    }
		}

		// skew probabilities for positions adjacent to hits
		skewProbabilityAroundHits(hits);

		//console.log(probabilities);
	}


	// Checking if this position is worth playing
	function isPositionValid(x,y) {	
		var ableToPlaceAShip = false; 

		if (shipsDestroyed.length = 4) {
			// Every ship is destroyed, return true
			return true;		
		}	
	
		// For each alive ship
		for (var i = 0; i < ships.length; i++) {
			if (shipsDestroyed.indexOf(ships[i].toString()) == -1) {
				var min_align = ships[i];		
				var cpt_l = 0;			
				var cpt_r = 0;
				var cpt_u = 0;
				var cpt_d = 0;



				// Exploring right
				while(cpt_r <= min_align && (x+cpt_r < boardSize) && (positions[x+cpt_r][y] != 1)) {
					cpt_r++;
				}
				// Exploring left
				while(cpt_l <= min_align && (x-cpt_l >= 0) && (positions[x-cpt_l][y] != 1)) {
					cpt_l++;
				}
				// Exploring down
				while(cpt_d <= min_align && (y+cpt_d < boardSize) && (positions[x][y+cpt_d] != 1)) {
					cpt_d++;
				}
				// Exploring up
				while(cpt_u <= min_align && (y-cpt_u >= 0) && (positions[x][y-cpt_u] != 1)) {
					cpt_u++;
				}
				console.log("For ship #" + min_align);
				console.log("  left : "+cpt_l);
				console.log("  right: "+cpt_r);
				console.log("  up   : "+cpt_u);
				console.log("  down : "+cpt_d);

				
				if (((cpt_l+cpt_r-1)>=min_align) || ((cpt_u+cpt_d-1)>=min_align)) {
					// we can place a ship !
					console.log("OK for #"+min_align); 
					ableToPlaceAShip = true;
				}
			}
		}
		//console.log(positions);
		return ableToPlaceAShip;
	}



        function getBestUnplayedPosition() {
		var bestProb = 0, found = false,
		    bestPos;

		while(!found) {
		console.log(probabilities);
			// Getting the best probability of the board
			for (var y = 0; y < boardSize; y++) {
			    for (var x = 0; x < boardSize; x++) {
				if (!positions[x][y] && positions[x][y] != 3 && probabilities[x][y] > bestProb) {
				    bestProb = probabilities[x][y];
				    bestPos = [x, y];
				}
			    }
			}
			// We found one position
			found = true;
			console.log("found : " + bestPos);
	
			if (!isPositionValid(bestPos[0],bestPos[1])) {
				// We need to mark the position as unvalid (3)
				positions[bestPos[0]][bestPos[1]] = 3;
				found = false;
				console.log("Unvalid: X:"+bestPos[0].toString() + " Y:" + bestPos[1].toString());
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
		if (fight_against_stab) {	
			// Checking which moves were played
			var index = 0;	
			while (input.hit.indexOf(moves_for_stab[index]) > -1 || input.missed.indexOf(moves_for_stab[index]) > -1) {
				index++;
			}
			// Playing recorded move
			console.log(JSON.stringify({
				move: moves_for_stab[index]
			}));
		} else {
			// That's the real game we are talking about !
			parseInput(input);
			recalculateProbabilities();
			console.log(JSON.stringify(getBestUnplayedPosition()));	
		}
	}

	process.exit(0);
