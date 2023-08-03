import "./style.css";
import { interval, fromEvent, zip, merge, pipe } from "rxjs";
import { map, filter, scan, takeUntil, reduce, concatAll } from "rxjs/operators";



function main() {
  /**
   * Inside this function you will use the classes and functions from rx.js
   * to add visuals to the svg element in pong.html, animate them, and make them interactive.
   *
   * Study and complete the tasks in observable examples first to get ideas.
   *
   * Course Notes showing Asteroids in FRP: https://tgdwyer.github.io/asteroids/
   *
   * You will be marked on your functional programming style
   * as well as the functionality that you implement.
   *
   * Document your code!
   */

  /**
   * This is the view for your game to add and update your game elements.
   */

   const CONSTANTS = {
    CANVASSIZE: 600,
    RECT_X: 0,
    GRASS_Y: 100,
    GRASS_HEIGHT: 50,
    RIVER_Y: 150,
    RIVER_HEIGHT: 150,
    FROG_ID: "frog",
    CAR_ID: "car",
    GOAL_ID: "goal",
    LOG_ID: "log",
    TURTLE_ID: "turtle",
    SQUID_ID: "squid",
    HIT_BACKWARDS: 100,
    LOG_WIDTH: 100,
    LOG_HEIGHT: 50,
    BLIND_HEIGHT: 100,
    SQUID_WIDTH: 40,
    LOG_SPACE_INBETWEEN: 30,
    GOAL_X: 50,
    GOAL_Y: 100,
    GOAL_WIDTH: 50,
    GOAL_HEIGHT: 50,
    MOVELEFT: -50,
    MOVERIGHT: 50,
    MOVEUP: -50,
    MOVEDOWN: 50,
    TURTLE_INITIAL_X: 300,
    SQUID_INITIAL_X: 300, 
    FROG_INITIAL_CX: 300,
    FROG_INITIAL_CY: 575,     
    FROG_INITIAL_R: 25,
    FROG_COLOUR: "green",
    OBJECT_WIDTH: 30,
    OBJECT_HEIGHT: 15,
    OBJECT_MOVE_SLOWLY: 5,
    OBJECT_MOVE_TO_LEFT: -5, 
    OBJECT_MOVE_TO_RIGHT: 5, 
    OBJECT_MOVE_FAST_TO_LEFT: -10,    
    OBJECT_MOVE_FAST_TO_RIGHT: 10,   
    OBJECT_SPACE_INBETWEEN: 15,
    TWO_OBJECT: 2,
    THREE_OBJECT: 3,
    FOUR_OBJECT: 4,
    FIVE_OBJECTS: 5,
    INITIAL_SPEED: 0,
    INITIAL_SCORE: 0,
    ROW_GOAL: 125,
    LOG_ROW1: 150,
    LOG_ROW2: 200,
    LOG_ROW3: 250,
    ROW_1_Y: 375,
    ROW_2_Y: 425,
    ROW_3_Y: 475,
    ROW_4_Y: 525,
    GAME_INTERVAL: 100,
    ORANGE_COLOUR: "#DB804E",
    BLUE_COLOUR: "#add8e6",
    GREEN_COLOUR: "#34A56F",
    BROWN_COLOUR: "#BA8E4A",
    BLACK_COLOUR:"#000000",
    BIG_REWARD: 1000,
    SMALL_REWARD: 50,
    INCREASE_SPEED: 5
  };
  
  const svg = document.querySelector("#svgCanvas") as SVGElement & HTMLElement;

  //To retrive the elements thats has been declared in index.html
  const backgorund = document.getElementById("background")!;  
  const frontground = document.getElementById("frontground")!;
  const score  = document.getElementById("currentScore")!;
  const highScore = document.getElementById("highestScore")!;
  const gameOverText  = document.getElementById("gameOverTxt")!;

    // Example on adding an element
  // The frog will be represented by circle
  const frogger = document.createElementNS(svg.namespaceURI, "circle");
  frogger.setAttribute("r", String(CONSTANTS.FROG_INITIAL_R));
  frogger.setAttribute("cx", String(CONSTANTS.FROG_INITIAL_CX));
  frogger.setAttribute("cy", String(CONSTANTS.FROG_INITIAL_CY));
  frogger.setAttribute(
    "style",
    ("fill:  green; stroke: green; stroke-width: 1px") 
  );
  // To make the frog on top of other element
  frontground.appendChild(frogger);

  // A utility function to create object with basic shapes.
  const createShape = (_shape:string,x:number, y:number, width:number, height:number, colour:string) =>{
    const shape = document.createElementNS(svg.namespaceURI,_shape);
    shape.setAttribute("x", String(x));
    shape.setAttribute("y", String(y));
    shape.setAttribute("width", String(width));
    shape.setAttribute("height", String(height));
    shape.setAttribute("fill", colour);
    return shape;
  }

  // The grass section, where the goals located, is represented by green rectangle, 
  const grass = createShape("rect", CONSTANTS.RECT_X, CONSTANTS.GRASS_Y, CONSTANTS.CANVASSIZE, CONSTANTS.GRASS_HEIGHT, CONSTANTS.GREEN_COLOUR);
  backgorund.appendChild(grass);

  // River section represented by blue rectangle
  const river = createShape("rect", CONSTANTS.RECT_X, CONSTANTS.RIVER_Y, CONSTANTS.CANVASSIZE, CONSTANTS.RIVER_HEIGHT, CONSTANTS.BLUE_COLOUR);
  backgorund.appendChild(river);

  
// The goal object is represent by orange square
// The logs is represent by brow rectangle
  type ObjectBodies = Readonly<{  
    id: string,                   
    x: number,
    y: number,
  }>;
  
  // The frogger is represent by circle
  type Frogger = Readonly<{
    id: string,
    cx: number,
    cy: number,
    r:number,
    is_blind: boolean     // This is to indicate whether frogger has collide with squid(enemy). 
  }>;

  // Game state, to kept track of the movement of all obstacles, logs, and frogger.
  type State = Readonly<{
    frog: Frogger,
    turtle: ObjectBodies,
    squid: ObjectBodies,
    cars_R1: Readonly<ObjectBodies[]>,
    cars_R2: Readonly<ObjectBodies[]>,
    cars_R3: Readonly<ObjectBodies[]>,
    cars_R4: Readonly<ObjectBodies[]>,
    logs_R1: Readonly<ObjectBodies[]>,
    logs_R2: Readonly<ObjectBodies[]>,
    logs_R3: Readonly<ObjectBodies[]>,
    goals: Readonly<ObjectBodies[]>,
    score: number,    // represent the current score of the player
    speed: number,    // To increase the speed of objects when player reached goal.
    gameOver: boolean // To indicate when to reset the game
  }>;

  
  // The instanceof required a class to carry out pattern matching in the reduceState() function. Reference: (FRP Asteroid, Tim(2022)) 
  class Move { constructor(public readonly cx:number, public readonly cy:number, public readonly flag: boolean = false) {}} 
  class Tick { constructor(public readonly elapsed:number) {} }
  type Key = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';
  type Event = 'keydown' | 'keyup';

  // Used to experience the time past in the game.
  const gameClock$ = interval(CONSTANTS.GAME_INTERVAL).pipe(
    map((begin_time) => new Tick(begin_time)) // Generate a new Tick() object for a specified interval of time
  );
  
  // A functions to creates objects in a specific rows in the canvas
  function createObstacles(y_coordinate:number, col: number, obj_width: number, space:number ,res:ObjectBodies[]): ObjectBodies[]{
    if (col ===0){
      return res;  // tail recursion, base case returns res which is a row of updated carObstacles
    } else{
      const newCar_Obstacles: ObjectBodies = {
        id: CONSTANTS.CAR_ID+"-Y: " + y_coordinate + "_" +col,  // To create a unique id for each car by taking their y coordinate and the number of current iteration
        x:  col * (obj_width +space), // Such that the car will maintain some space between each other
        y:  y_coordinate, // Indicate the which row the car will be placed
      }
      return createObstacles( y_coordinate, col-1, obj_width, space, res.concat([newCar_Obstacles]));
    };
  }

  function createGoals(y_coordinate:number, _number: number, res:ObjectBodies[]): ObjectBodies[]{
    if (_number ===0){
      return res; 
    } else{
      const newGoals: ObjectBodies = {
        id: CONSTANTS.GOAL_ID+"-Y:"+ y_coordinate + "_" + _number,
        x: _number * (CONSTANTS.GOAL_WIDTH*2)-CONSTANTS.GOAL_WIDTH/2, 
        y: y_coordinate,
      };
      return createGoals( y_coordinate, _number-1, res.concat([newGoals]));
    };
  }

  const initialState: State = {
    frog: { id: CONSTANTS.FROG_ID,
            cx: CONSTANTS.FROG_INITIAL_CX, 
            cy: CONSTANTS.FROG_INITIAL_CY, 
            r: CONSTANTS.FROG_INITIAL_R,
            is_blind: false,
            },
    turtle: { id: CONSTANTS.TURTLE_ID,
              x: CONSTANTS.TURTLE_INITIAL_X,    
              y: CONSTANTS.ROW_1_Y
            },
    squid: {  id: CONSTANTS.SQUID_ID,
              x: CONSTANTS.SQUID_INITIAL_X,
              y: CONSTANTS.LOG_ROW2,
            },
    cars_R1: createObstacles(CONSTANTS.ROW_1_Y, CONSTANTS.FOUR_OBJECT, CONSTANTS.OBJECT_WIDTH, CONSTANTS.OBJECT_SPACE_INBETWEEN, []),
    cars_R2: createObstacles(CONSTANTS.ROW_2_Y, CONSTANTS.THREE_OBJECT,CONSTANTS.OBJECT_WIDTH, CONSTANTS.OBJECT_SPACE_INBETWEEN, []),
    cars_R3: createObstacles(CONSTANTS.ROW_3_Y, CONSTANTS.TWO_OBJECT,CONSTANTS.OBJECT_WIDTH, CONSTANTS.OBJECT_SPACE_INBETWEEN, []),
    cars_R4: createObstacles(CONSTANTS.ROW_4_Y, CONSTANTS.THREE_OBJECT,CONSTANTS.OBJECT_WIDTH, CONSTANTS.OBJECT_SPACE_INBETWEEN, []),
    logs_R1: createObstacles(CONSTANTS.LOG_ROW1, CONSTANTS.TWO_OBJECT,CONSTANTS.LOG_WIDTH, CONSTANTS.LOG_SPACE_INBETWEEN, []),
    logs_R2: createObstacles(CONSTANTS.LOG_ROW2, CONSTANTS.THREE_OBJECT,CONSTANTS.LOG_WIDTH, CONSTANTS.LOG_SPACE_INBETWEEN, []),
    logs_R3: createObstacles(CONSTANTS.LOG_ROW3, CONSTANTS.FOUR_OBJECT,CONSTANTS.LOG_WIDTH, CONSTANTS.LOG_SPACE_INBETWEEN, []),
    goals: createGoals(CONSTANTS.GOAL_Y, CONSTANTS.FIVE_OBJECTS, []),
    score: CONSTANTS.INITIAL_SCORE,
    speed: CONSTANTS.INITIAL_SPEED,
    gameOver: false
  }; 

  // Check if there is collision between frog with various objects
  const handleCollisions = (state:State):State => {
    
    let flag = false;
    const 
     frogY = state.frog.cy, //To makes frogY(center) in the same y as the row of image of car we. 
     frogX_left = state.frog.cx - CONSTANTS.FROG_INITIAL_R,
     frogX_right = state.frog.cx + CONSTANTS.FROG_INITIAL_R,
     river_top = CONSTANTS.RIVER_Y,
     river_bottom = CONSTANTS.RIVER_Y+CONSTANTS.RIVER_HEIGHT;

    // Check collision by checking whether there is intersection between frogger and the object
    const collisions = (obj: ObjectBodies, obj_width: number): boolean =>{
      const 
        objX_left = obj.x ,
        objX_right = obj.x + obj_width;
      if(frogX_right > objX_left && frogX_right < objX_right){  
        return true;                                            
      }   else if (frogX_left < objX_right && frogX_left > objX_left){  
        return true
      }
      return false;
    }

    // Check if frogger has fit itself exactly into the goal
    const goal_collision = (g: ObjectBodies): boolean =>{
      const goal_left = g.x;
      const goal_right = g.x + CONSTANTS.GOAL_WIDTH;
      if (frogX_left === goal_left && frogX_right === goal_right){
        return true;}
      return false;
    }

    // For each row of objects, filter if there is any collisions
    if(frogY === CONSTANTS.ROW_1_Y){
      flag = (state.cars_R1.filter(r=>collisions(r, CONSTANTS.OBJECT_WIDTH)).length > 0);
      
      // The first enemy "turtle" only appears within the first row on the ground section
      // Check if frogger hit the turtle
      if(flag===false && collisions(state.turtle, CONSTANTS.OBJECT_WIDTH)){
        return{...state,
                frog: {...state.frog,     // The turtle will "bounce" the frogger backwards by 2 steps, disturb frogger from reaching the goal.
                      cy: state.frog.cy + CONSTANTS.HIT_BACKWARDS}
              }}
    }   
    else if(frogY === CONSTANTS.ROW_2_Y){
      flag = (state.cars_R2.filter(r=>collisions(r, CONSTANTS.OBJECT_WIDTH)).length > 0);
    }   
    else if(frogY === CONSTANTS.ROW_3_Y){
      flag = (state.cars_R3.filter(r=>collisions(r, CONSTANTS.OBJECT_WIDTH)).length > 0);
    }   
    else if(frogY === CONSTANTS.ROW_4_Y){
      flag = (state.cars_R4.filter(r=>collisions(r, CONSTANTS.OBJECT_WIDTH)).length > 0);
    }   

    // When the frogger enters the river section
    else if(frogY <= river_bottom && frogY >= river_top){
        if (frogY === (CONSTANTS.LOG_ROW1 + CONSTANTS.LOG_HEIGHT/2)){ // Obtain the centre y-coordinate of the logs.
          flag = !(state.logs_R1.filter(r=>collisions(r, CONSTANTS.LOG_WIDTH)).length > 0) }
          
          // The second enemy "squid" will only appears in the second row of river sections
          else if (frogY === (CONSTANTS.LOG_ROW2 + CONSTANTS.LOG_HEIGHT/2)){
            flag = !(state.logs_R2.filter(r=>collisions(r, CONSTANTS.LOG_WIDTH)).length > 0);
             
            // If frogger collide with squid, the frog's is_blind status will changed
            // "is_blind" will be used to block the player's view to increase the difficulty of the gmae
            if(flag===false && collisions(state.squid, CONSTANTS.SQUID_WIDTH)){
              return{...state,
                frog: {...state.frog, is_blind: true}
                };
              };
        } else{
          flag = !(state.logs_R3.filter(r=>collisions(r,CONSTANTS.LOG_WIDTH)).length > 0);
          }
      }

    // When the frogger reached the goal
    else if (state.frog.cy === CONSTANTS.ROW_GOAL){
      flag = (state.goals.filter(g => goal_collision(g)).length >0);
      if (flag){
        const currentScore = state.score;
        const currentSpeed = state.speed;
        //The spread operator is used to copy all of the property off state
        return {...state, 
                frog: initialState.frog, 
                score: currentScore+CONSTANTS.BIG_REWARD, 
                speed: currentSpeed + CONSTANTS.INCREASE_SPEED};  // When the frogger reached the goal, the speed of the cars and logs will increase 
      }}
    return {
      ...state,
      gameOver: flag
    }};
  
  // wrap the positions of object such that it alway within the canvas (FRP Asteroid, TIM)
  const wrap = (coordinate:number) => coordinate < 0 ? coordinate + CONSTANTS.CANVASSIZE
                                        : coordinate > CONSTANTS.CANVASSIZE ? coordinate - CONSTANTS.CANVASSIZE 
                                          : coordinate;
  const wrapObstacle = (obj:ObjectBodies, speed: number)=> <ObjectBodies>{
    ...obj,
    x: wrap(obj.x + speed)
  }
  // For each specify game interval, this function will be called by reduceState to check for any collision between frogger with other objects
  const tick = (state:State) => {

    if (state.gameOver){
      return {...initialState};     // reset the game to its original position

    }
    return handleCollisions(
      {
      ...state,
      turtle: wrapObstacle(state.turtle, CONSTANTS.OBJECT_MOVE_SLOWLY),
      squid: wrapObstacle(state.squid, CONSTANTS.OBJECT_MOVE_SLOWLY),
      cars_R1: state.cars_R1.map((car)=> wrapObstacle(car, CONSTANTS.OBJECT_MOVE_FAST_TO_RIGHT+ state.speed)),
      cars_R2: state.cars_R2.map((car)=> wrapObstacle(car, CONSTANTS.OBJECT_MOVE_FAST_TO_LEFT - state.speed)),
      cars_R3: state.cars_R3.map((car)=> wrapObstacle(car, CONSTANTS.OBJECT_MOVE_TO_LEFT - state.speed)),
      cars_R4: state.cars_R4.map((car)=> wrapObstacle(car, CONSTANTS.OBJECT_MOVE_TO_RIGHT+ state.speed)),
      logs_R1: state.logs_R1.map((log) => wrapObstacle(log, CONSTANTS.OBJECT_MOVE_TO_RIGHT+ state.speed)),
      logs_R2: state.logs_R2.map((log) => wrapObstacle(log, CONSTANTS.OBJECT_MOVE_TO_LEFT - state.speed)),
      logs_R3: state.logs_R3.map((log) => wrapObstacle(log, CONSTANTS.OBJECT_MOVE_TO_RIGHT+ state.speed))
      })
    }

  const reduceState = (accState:State, event: Move | Tick):State => {
    if (event instanceof Move){
      if(event.flag === true){
        const currentScore = accState.score;
        return {...accState, frog: {...accState.frog, cx: wrap(event.cx), cy: wrap(event.cy)}, score: currentScore+CONSTANTS.SMALL_REWARD};  
      }
      return {...accState, frog: {...accState.frog, cx: wrap(event.cx), cy: wrap(event.cy)}}    //Pure as we create new State
    }
    else if (event instanceof Tick){    
      return tick(accState)
    } else{
      return accState;
    };
  };

  // Generate a stream of observable of Move objects (FRP Asteroid, TIM)
  const keyObservable = <T>(event: Event, key:Key, result:()=>T)=>
      fromEvent<KeyboardEvent>(document,event)
        .pipe(
          filter(({code})=>code === key),
          filter(({repeat})=>!repeat),  
          map(result));

  const to_left = keyObservable('keydown','ArrowLeft',()=>new Move(Number(frogger.getAttribute("cx"))+CONSTANTS.MOVELEFT, Number(frogger.getAttribute("cy"))));
  const to_right = keyObservable('keydown','ArrowRight',()=>new Move(Number(frogger.getAttribute("cx"))+CONSTANTS.MOVERIGHT, Number(frogger.getAttribute("cy"))));
  const to_up = keyObservable('keydown','ArrowUp',()=>new Move(Number(frogger.getAttribute("cx")), Number(frogger.getAttribute("cy"))+CONSTANTS.MOVEUP, true)); 
  const to_down = keyObservable('keydown','ArrowDown',()=>new Move(Number(frogger.getAttribute("cx")), Number(frogger.getAttribute("cy"))+CONSTANTS.MOVEDOWN));

  // Merge all of the key together
  const  keys$ = merge(to_left,to_right,to_up,to_down);
  //Main game loop
  const mainSubscription =
  merge(keys$, gameClock$)
  .pipe(
    scan(reduceState,initialState))
    .subscribe(updateView);


    //Note: the function below is impure function because it move position of frogger, cars, and logs//
  function updateView(state: State) {
    const 
      canvas = document.getElementById("svgCanvas")!,
      carImage_src = "https://pages.cs.wisc.edu/~bahls/all/Frogger/car.png",
      turtleImage_src = "https://cdn2.iconfinder.com/data/icons/files-and-folders-vol-4/64/mario-turtle-512.png",
      squidImage_src = "https://openclipart.org/image/2400px/svg_to_png/174328/1358540163.png";

    // Move frog 
    frogger.setAttribute("cx", String(state.frog.cx));
    frogger.setAttribute("cy", String(state.frog.cy));

    // The blindness will make the player unable to the see movement of the objects in current row and a row above. 
    const blind_rect = createShape("rect", CONSTANTS.RECT_X, CONSTANTS.LOG_ROW1, CONSTANTS.CANVASSIZE, CONSTANTS.BLIND_HEIGHT, CONSTANTS.BLACK_COLOUR);
    if(state.frog.is_blind){
      frontground.appendChild(blind_rect);
      const blind_timer$ =  interval(1000).subscribe((_)=> {frontground.removeChild(blind_rect)});   // The blindness cause by squid will be removed after 1 seconds                                             
      }

    // Update current score
    const currentScore = state.score;
    score.textContent = String(currentScore);

    // Check if need to update high score
    let _highestScore = Number(highScore.textContent);
    if(currentScore > _highestScore){
      _highestScore = currentScore;
      highScore.textContent = String(_highestScore);
    }

    // A functions thats helps to update the views of objects that has images other than simple shapes.
    const updateObstaclesViews = (objState: ObjectBodies, width:number, height: number, imageSrc: string) =>{
      const obj = document.getElementById(objState.id);
      if (obj != null){ // case 1: obstacles exists -> update the attribute
        obj.setAttribute("x", String(objState.x));
      }else{    //case 2: obstacles does not exist -> create an array obstacles
      const newCar_Obstacles = document.createElementNS(canvas.namespaceURI, "image");  // build a html element with <image> node 
      newCar_Obstacles.setAttribute("id", objState.id);
      newCar_Obstacles.setAttribute("href", imageSrc);
      newCar_Obstacles.setAttribute("width", String(width));
      newCar_Obstacles.setAttribute("height", String(height));  
      newCar_Obstacles.setAttribute("x",String(objState.x));
      newCar_Obstacles.setAttribute("y",String(objState.y));
      frontground.appendChild(newCar_Obstacles);
        };
    }
    state.cars_R1.forEach((i)=> updateObstaclesViews(i,CONSTANTS.OBJECT_WIDTH,CONSTANTS.OBJECT_HEIGHT, carImage_src));
    state.cars_R2.forEach((i)=> updateObstaclesViews(i,CONSTANTS.OBJECT_WIDTH,CONSTANTS.OBJECT_HEIGHT, carImage_src));
    state.cars_R3.forEach((i)=> updateObstaclesViews(i,CONSTANTS.OBJECT_WIDTH,CONSTANTS.OBJECT_HEIGHT, carImage_src));
    state.cars_R4.forEach((i)=> updateObstaclesViews(i,CONSTANTS.OBJECT_WIDTH,CONSTANTS.OBJECT_HEIGHT, carImage_src));
    updateObstaclesViews(state.turtle, CONSTANTS.OBJECT_WIDTH, CONSTANTS.OBJECT_HEIGHT, turtleImage_src);
    updateObstaclesViews(state.squid, CONSTANTS.SQUID_WIDTH, CONSTANTS.LOG_HEIGHT, squidImage_src);

    const updateLogViews = (logState: ObjectBodies)=>{  // The log is represent as basic shape 
      const obj = document.getElementById(logState.id);
      if (obj != null){ // case 1: goad exists -> update the has_reach
        obj.setAttribute("x", String(logState.x));
      }else{    //case 2: goal does not exist -> create a list of goals
      const log = createShape("rect", logState.x, logState.y, CONSTANTS.LOG_WIDTH, CONSTANTS.LOG_HEIGHT, CONSTANTS.BROWN_COLOUR);
      log.setAttribute("id", logState.id);
      log.setAttribute("width", String(CONSTANTS.LOG_WIDTH));
      log.setAttribute("height", String(CONSTANTS.LOG_HEIGHT));
      log.setAttribute("x", String(logState.x));
      log.setAttribute("y", String(logState.y));
      backgorund.appendChild(log);    
    };
    }
    state.logs_R1.forEach(updateLogViews);
    state.logs_R2.forEach(updateLogViews);
    state.logs_R3.forEach(updateLogViews);

    // This functions only create a goal views as there is no need to move the goal
    const updateGoalViews = (goalstate: ObjectBodies)=>{
      const obj = document.getElementById(goalstate.id);
      if (obj != null){ // case 1: goad exists -> update the has_reach
        obj.setAttribute("x", String(goalstate.x));
      }else{    //case 2: goal does not exist -> create a list of goals
      const target = createShape("rect", goalstate.x, goalstate.y, CONSTANTS.GOAL_WIDTH, CONSTANTS.GOAL_HEIGHT, CONSTANTS.ORANGE_COLOUR);
      backgorund.appendChild(target);    
    };
    }
    state.goals.forEach(updateGoalViews);

    // Make the Game Over text to appear on the canvas
    if(state.gameOver) {
      gameOverText.textContent = "Game Over! Score: "+ currentScore;
      gameOverText.removeAttribute("display");      //To show the hidden text
      const timer$ =  interval(2000).subscribe((_)=> gameOverText.setAttribute("display", "none"));  // Make the text to disppear after two seconds. 
    }
  }
}

// The following simply runs your main function on window load.  Make sure to leave it in place.
if (typeof window !== "undefined") {
  window.onload = () => {
    main();
  };
}
