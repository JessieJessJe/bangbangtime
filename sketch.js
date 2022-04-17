// let room = new URLSearchParams(location.search).get("room");
let room = null;
console.log("room:", room);

let shared, bullets, timer; // shared objects
let participants; // role: "player1" | "player2" | "observer"
let my;

let sfx = [];

var ASSETS_manager;

// global state
//let gameState = "PLAYING"; // TITLE, PLAYING

// general local parameters
var NORMAL_VEC;
var local_commands = []; // ESSENTIAL!!! --- local commands collection to control the clones
var await_commands = []; // actions waiting to be executed

//timer
const ROUND_DURATION = 10; 
const ROUND_TOTAL = 10;

const FRAME_RATE = 60;

// in-game parameters
const CLONE_MODE_ON = false;
var bullet_cooldown_id = {};
const CHARACTER_SIZE = 40, BULLET_SIZE = 16, CHARACTER_VOL = 3, BULLET_VOL = 7, STAR_SIZE = 20;
const RELOAD_TIMER = 60, STUNNED_TIMER = 40, WINNING_SCORE = 5;

function preload() {
  partyConnect(
    "wss://deepstream-server-1.herokuapp.com",
    "bang_bang",
    "room"
  );
  
  shared = partyLoadShared("shared");
  bullets = partyLoadShared("bullets");
  timer = partyLoadShared("timer");
  
  my = partyLoadMyShared();
  participants = partyLoadParticipantShareds();
  
  
  // load assets
  ASSETS_manager = new Map();
  // for (let i = 0; i < 11; i++){
  //   sfx[i] = loadSound('sfx/sfx_' + i + '.wav');
  // } 
  
  // for (let i = 1; i < 6; i++){
  //   img[i] = loadImage('img/inst_' + i + '.jpg');
  // }
  font = loadFont('sancreek.ttf');
  
  ASSETS_manager.set("star", loadImage('assets/star.png'));
  ASSETS_manager.set("mask", loadImage('assets/mask.png'));
  ASSETS_manager.set("hat", loadImage('assets/hat.png'));
}

function setup() {
  createCanvas(600, 600);
  frameRate(FRAME_RATE);
  angleMode(DEGREES);
  colorMode(HSB, 255);
  rectMode(CENTER);
  
  textAlign(CENTER,CENTER);
  textFont(font);
  
  noStroke();
  NORMAL_VEC = createVector(1, 0);
  
  //partyToggleInfo(false);
  
  if (partyIsHost()) { 
    stepHost();       
  } else if (participants.length >= 3) {
    //we still need to fix the observer view 
    //me.role = "observer";
    partySetShared(my, {
    role: "observer",
    });
  }

  // subscribe party functions
  partySubscribe("resetLocalClients", resetLocalPlayer);
  partySubscribe("clearBullets", clearBullets);
  partySubscribe("stun", stun);
}

function draw() {
  
  background("rgb(202,44,44)");
  
  if (room) { // room == null

    noStroke();
    textSize(20);
    fill(0);
    text("create/choose a room", width/2, height/3 - 50);
    text("using the input ", width/2, height/3 - 25);
    text("field above", width/2, height/3);
    
  } else {
    
    background("rgb(218,218,36)");
    if (my.role !== "player1" && my.role !== "player2") {
        joinGame();
      console.log(my.role)
        return;
    }

   // if(!shared.isRunning) {
    //if (gameState === "TITLE") {
    background("rgb(42,185,42)");
    // drawTitleScreen();
   // }

   // if(shared.gameState) {
    //if (gameState === "PLAYING") {
    background("rgb(0,0,0)");
    drawGame();
    //}
  }
}

function joinGame() {
  // don't let current players double join
  if (my.role === "player1" || my.role === "player2") {
    return;
  }

  if (!participants.find((p) => p.role === "player1")) {
    my.role = "player1";
    initializePlayer();
    return;
  }
  if (!participants.find((p) => p.role === "player2")) {
    my.role = "player2";
    initializePlayer();
    return;
  }
}

function stepHost(){
  shared.isRunning = false;
  shared.star = { // initialize the star
    pos_x: width / 2,
    pos_y: height / 2,
    vol: 0,
    dir: random(360),
    size: STAR_SIZE,
    isPicked: false
  }

  bullets.bullets = [];

  timer.roundFrame = 0;
  timer.count = ROUND_DURATION;
  timer.roundCount = 0;
}

function initializePlayer(){
  my.enabled = false; // if the player is playing the game
  my.id = round(random(100)); // assign a unique ID to the player
  my.score = 0;
  my.isWin = false;

  my.alive = false; // if the player is alive
  my.origin = {
    pos_x: width / 2, // x postion
    pos_y: height / 2, // y postion
    vol: CHARACTER_VOL,
    dir: random(360), // face direction
    size: CHARACTER_SIZE,
    color: round(random(255)),
    reload: 0, // reloading cooldown timer
    stunned: 0, // stunned cooldown timer
    hasStar: false // if the character has the star
  };
  
  my.newBullet = [], // bullets waiting to be update
  my.startPos = {x: 0, y: 0};
  my.clones = [];
}