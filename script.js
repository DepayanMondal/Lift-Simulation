// Global variables
let numberOfFloors;
let numberOfLifts;
let liftData = [];
let buttonPressQueue = [];
let floorOccupancy = [];

// Event listener for user inputs
document.querySelector("form").addEventListener("submit", function(e) {
    e.preventDefault();
    const floorCount = parseInt(document.querySelector("#NumberOfFloors").value);
    const liftCount = parseInt(document.querySelector("#NumberOfLifts").value);

    if (isValidInput(floorCount, liftCount)) {
        numberOfFloors = floorCount;
        numberOfLifts = liftCount;
        initializeSimulation();
    } else {
        alert("Please enter valid numbers for floors and lifts. The number of lifts should not exceed the number of floors.");
    }
});
// function to check if inputs are valid
function isValidInput(floors, lifts) {
    return !isNaN(floors) && floors > 0 && !isNaN(lifts) && lifts > 0 && lifts <= floors;
}
// triggers required data structures, floors and lifts, event handling
function initializeSimulation() {
    generateFloorsAndLifts();
    initializeLiftData();
    initializeFloorOccupancy();
    handleButtonClicks();
    document.querySelector("form").style.display = "none"; // hides input form
    document.querySelector("#simulation_page").style.display = "flex";
}

function generateFloorsAndLifts() {
    const floorContainer = document.querySelector("#floor_container");
    floorContainer.innerHTML = ""; //Clears any existing content inside the floor_container
    // looped in reverse order so floor 0 is at the bottom
    for (let i = numberOfFloors - 1; i >= 0; i--) {
        const floor = createFloor(i); // calls createFloor() function to generate a floor at the i-th position
        floorContainer.appendChild(floor); //adds created floor to the floor_container
    }

    // Add lifts to the ground floor
    const groundFloor = document.getElementById('0'); //id = "0" to select the ground floor where lifts will be placed
    for (let j = 0; j < numberOfLifts; j++) {
        const lift = createLift(j); //Calls createLift() function to generate HTML structure for each lift.
        groundFloor.appendChild(lift);
    }
}
// generates the html floor elements and lift controls
function createFloor(floorNumber) {
    const floor = document.createElement("div");
    floor.className = "floor";
    floor.id = floorNumber; // Assigns an id to each floor div based on it's floor number

    const liftControl = document.createElement("div");
    liftControl.className = "lift_controls";

    const floorNumberElement = document.createElement("p");
    floorNumberElement.className = "floor_number";
    if (floorNumber === 0) {
        floorNumberElement.textContent = "Ground";
    } else {
        floorNumberElement.textContent = "Floor " + floorNumber;
    }

    const buttonContainer = document.createElement("div");
    buttonContainer.className = "call_lift";

    liftControl.appendChild(floorNumberElement);
    liftControl.appendChild(buttonContainer);
    floor.appendChild(liftControl);

    if (floorNumber === 0) { //Checks for ground floor
        const callButton = createButton("call", "G");
        buttonContainer.appendChild(callButton);
    } else if (floorNumber === numberOfFloors - 1) { // Top floor should only have a "down" button
        const downButton = createButton("down", "▼");
        buttonContainer.appendChild(downButton);
    } else { //for any other floor
        const upButton = createButton("up", "▲"); // calls createButton() function with classname and button text as inputs
        const downButton = createButton("down", "▼");
        buttonContainer.appendChild(upButton);
        buttonContainer.appendChild(downButton);
    }
    return floor; // returns div with the floor's HTML structure
}
// this fuction creates buttons with classname and innerhtml
function createButton(className, text) {
    const button = document.createElement("button");
    button.className = className;
    button.innerHTML = text;
    return button;
}
// function to create lift element
function createLift(liftIndex) {
    const lift = document.createElement("div");
    lift.className = "lift";
    lift.id = `lift-${liftIndex}`; // assignes lift id based on liftIndex

    const liftDoors = document.createElement("div");
    liftDoors.className = "door";

    const leftDoor = document.createElement("div");
    leftDoor.className = "door_left";

    const rightDoor = document.createElement("div");
    rightDoor.className = "door_right";

    liftDoors.appendChild(leftDoor);
    liftDoors.appendChild(rightDoor);
    lift.appendChild(liftDoors);

    return lift; // retirned the finished lift element
}
// initializes an array of objects containing info about each lift
function initializeLiftData() {
    liftData = Array.from({ length: numberOfLifts }, function(_, index) {
        return {
            liftIndex: index,
            currentFloor: 0,
            targetFloor: 0,
            isMoving: false
        };
    });
}

// function to initialize floor occupancy status
function initializeFloorOccupancy() {
    floorOccupancy = Array(numberOfFloors).fill(false);
}

// Updates the occupancy status of a specific floor in the floorOccupancy[] array
function updateFloorOccupancy(floorNumber, isOccupied) { // (index of floor, boolean value)
    floorOccupancy[floorNumber] = isOccupied; // isOccupied = True
}
// Sets up event listeners on all lift control buttons to manage button press, process lift requests
function handleButtonClicks() {
    document.querySelectorAll(".up, .down, .call").forEach(function(button) { // selects all elements with "up" "down" "call" classname and iterates for each selected element
        button.addEventListener("click", function() { //adds "click" event listner to each button
            const floorID = parseInt(this.closest(".floor").id); // gets the ID of the floor containing the clicked button
            const buttonType = this.className; // gets the class name of the clicked button to indicates it's type: up, down, call

            // Check if the floor is not occupied
            if (!floorOccupancy[floorID]) {
                buttonPressQueue.push({ floorID, buttonType, timestamp: Date.now() }); // adds button press object to array
                processLiftRequests(); // calls lift request to be processed
            } else {
                console.log(`Floor ${floorID} is already occupied. Request ignored.`);

                // Find the lift on the occupied floor and trigger the door animation
                const liftAtOccupiedFloor = findLiftAtFloor(floorID);
                if (liftAtOccupiedFloor) { // if lift is found
                    const liftElement = document.getElementById(`lift-${liftAtOccupiedFloor.liftIndex}`); //get lift id
                    animateDoors(liftElement, function() { // Calls the animateDoors() function to play the lift door animation
                        console.log(`Lift doors animated at occupied floor ${floorID}.`);
                    });
                }
            }
        });
    });
}

// function to find lift at the specific floor used to trigger lift door animation at occupied floors
function findLiftAtFloor(floorID) {
    return liftData.find(function(lift) { //Searches through liftData to find the first lift meeting the criteria.
        return lift.currentFloor === floorID && !lift.isMoving; // Checks if the lift is currently at the specified floorID and is not moving and returns the matching lift object
    });
}
// Processes button press requests from the queue and manages lift assignment based on current status of the lifts and floors.
function processLiftRequests() {
    if (buttonPressQueue.length === 0) return; // Exits the function if there are no requests in the queue.

    const request = buttonPressQueue[0]; // Retrieves the first request in the queue without removing it
    // Check if the requested floor is already occupied
    if (floorOccupancy[request.floorID]) {
        buttonPressQueue.shift(); // Remove the request for the occupied floor
        processLiftRequests(); // Continue processing the next request
        return;
    }

    const availableLift = findNearestAvailableLift(request.floorID); // calls findNearestAvaulableLift() function to find the nearest lift that can answer the current button press request.
    if (availableLift !== null) { // if available lift is found
        buttonPressQueue.shift(); // Remove the request only if it can be processed
        moveLift(availableLift, request.floorID); // calls the moveLift function with (liftIndex of the available lift, floorID of the button press request)
    } else {
        setTimeout(processLiftRequests); // Check again after 1 second
    }
}
// finds the nearest available lift and assigns it to a pending button press request
function findNearestAvailableLift(targetFloor) {
    let nearestLift = null; //null is used to represent the absence of a lift initially.
    let minDistance = Infinity; //Infinity is used as an initial value because it is guaranteed to be larger than any real distance calculated during the iteration

    // If the target floor is occupied, return null this is useful when button is pressed at a floor which already has a lift
    if (floorOccupancy[targetFloor]) {
        return null;
    }
    // calculates and compares closest available lift
    liftData.forEach(function(lift) {
        if (!lift.isMoving) { // if not moving
            const distance = Math.abs(lift.currentFloor - targetFloor); // calculates the distance from the lift's current floor to the target floor.
            if (distance < minDistance) { // If the current lift is closer than the previous nearest lift
                minDistance = distance; //update minDistance and set nearestLift to the current lift.
                nearestLift = lift;
            }
        }
    });
    return nearestLift; // returns lift object of the nearest available lift/ returns null if no lift is found
}
// moves a specified lift to a target floor, manages lift movement animation and updates floor occupancy status
function moveLift(lift, targetFloor) {
    lift.isMoving = true; // Set the lift's status to moving.
    lift.targetFloor = targetFloor; // Update the lift's target floor.

    updateFloorOccupancy(targetFloor, true); // Mark the target floor as occupied
    updateFloorOccupancy(lift.currentFloor, false); // Mark the current floor as unoccupied

    const liftElement = document.getElementById(`lift-${lift.liftIndex}`); // select lift's html element
    const floorHeight = document.querySelector('.floor').offsetHeight; // determine height of ".floor" (offsetHeight don't account for margin)
    const distance = (targetFloor - lift.currentFloor) * floorHeight; // calculate the total distance the lift needs to travel
    const duration = Math.abs(targetFloor - lift.currentFloor) * 2; // 2 seconds per floor

    // Start moving the lift immediately
    liftElement.style.transition = `transform ${duration}s linear`; // this property specifies that any changes to the transform property should occur over a specified duration(2sec per floor) in a smooth, linear fashion.
    liftElement.style.transform = `translateY(-${(targetFloor * floorHeight) + (targetFloor *4)}px)`; // accounting for 4px margin of each floor

    // After lift reaches the target floor, triggers lift door animation
    setTimeout(() => {
        lift.currentFloor = targetFloor; // updates the lift's current floor to the target floor.
        animateDoors(liftElement, () => { // animateDoors() function is called to visually animate the lift doors
            lift.isMoving = false; // isMoving property of lift object is set to false
            setTimeout(() => {
                processLiftRequests();
            });
        });
    }, duration * 1000); // delays the execution of its enclosed code until  time it takes for lift to move to target floor(duration) * 1000 milliseconds have passed
}
// applies lift door animation
function animateDoors(liftElement, callback) {
    const leftDoor = liftElement.querySelector('.door_left');
    const rightDoor = liftElement.querySelector('.door_right');

    // Open doors
    leftDoor.style.transform = 'translateX(-100%)';
    rightDoor.style.transform = 'translateX(100%)';

    // Close doors after 2.5 seconds
    setTimeout(() => {
        leftDoor.style.transform = 'translateX(0)';
        rightDoor.style.transform = 'translateX(0)';
        // Execute callback after doors close
        setTimeout(callback, 2500); // Duration of the doors closing animation
    }, 2500);
}
