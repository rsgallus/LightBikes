/* ------------------- WEB CLIENT ----------------------------- */

// Connect to websocket server
var socket = io.connect('http://localhost:5000');
socket.emit('newConnection');

// Variable for client username
var clientUsername = "";

// Variable for users list
var usersListString = "";

// Called on login form submit
function login() {
  console.log("logging in");

  // Get form data
  username = document.forms["loginForm"]["username"].value;
  password = document.forms["loginForm"]["password"].value;

  clientUsername = username;

  // Send username and password to server
  socket.emit('verifyUser', username, password);
}

// Called on new account button
function loadNewAccountPage() {
  socket.emit('loadNewAccountPage');
}

// Called on create new account form submit
function newAccount() {
  console.log("creating a new account");

  // Get form data
  username = document.forms["accountForm"]["newUsername"].value;
  password1 = document.forms["accountForm"]["newPassword1"].value;
  password2 = document.forms["accountForm"]["newPassword2"].value;

  if(password1 != password2) {

    var message = document.getElementById("message");
    message.innerHTML = "*Your passwords did not match. Please try again.";

    document.getElementById("accountForm").reset();
  }
  else {
    socket.emit('newAccount', username, password1);
  }

}

// Called on challenge user
function challengeUser(username) {
  var message = document.getElementById("message");
  if (username == clientUsername) {
    message.innerHTML = "*You cannot challenge yourself. Please pick another user";
  }
  else {
    message.innerHTML = "Challenging " + username + "...";
    socket.emit('challengeUser', username);
  }
}

// Called by logout button
function logout() {
  socket.emit('logout', username);
  console.log("logging out");

  setTimeout(function () {
       window.location.href = "index.html";
    }, 500);
}

/* ------------------- EVENT HANDLERS ----------------------------- */

// On successful connection to server
socket.on('handshake', function() {
  console.log("successfully connected to the server");
});

// On change in user list
socket.on('updateUsersList', function(htmlString) {
  console.log("updating users list");

  var usersList = document.getElementById("usersList");
  if (usersList != null) {
    usersList.innerHTML = htmlString;
  }
  usersListString = htmlString;

});

// On successful login
socket.on('loginSuccess', function() {
  var username = document.getElementById("username");
  username.innerHTML = clientUsername;

  var logout = document.getElementById("logout");
  logout.style.visibility = "visible";
});

// On incorrect username/password
socket.on('loginFailed', function() {
  console.log("Warning: invalid username/password");

  var message = document.getElementById("message");
  message.innerHTML = "*Invalid username or password. Please try again.";

  document.getElementById("loginForm").reset();
});

// On username already in use
socket.on('alreadyLoggedIn', function() {
  console.log("Warning: that username is already in use");

  var message = document.getElementById("message");
  message.innerHTML = "*This username is already in use. Please use a different account.";

  document.getElementById("loginForm").reset();
});

// On load create new account page
socket.on('loadNewAccountPage', function(htmlString) {
  console.log("Loading new account page");
  var content = document.getElementById("content");
  content.innerHTML = htmlString;
});

// On successful account creation
socket.on('newAccountCreated', function() {
  console.log("Account created successfully");

  var message = document.getElementById("message");
  message.innerHTML = "Your account has been successfully created. Page will reload in 3 seconds.";

  document.getElementById("accountForm").reset();
  setTimeout(function () {
       window.location.href = "index.html";
    }, 3000);

});

// On username unavailable
socket.on('usernameUnavailable', function() {
  console.log("Warning: username unavailable");

  var message = document.getElementById("message");
  message.innerHTML = "*The username you have selected is unavailable. Please try again.";

  document.getElementById("accountForm").reset();
});

// On load lobby page
socket.on('loadLobbyPage', function(htmlString) {
  console.log("loading lobby page");

  var content = document.getElementById("content");
  content.innerHTML = htmlString;

  var usersList = document.getElementById("usersList");
  usersList.innerHTML = usersListString;
});

// On new challenge
socket.on('newChallenge', function(username) {
  if(confirm("You have been challenged by " + username + "! Do you accept?")) {
    socket.emit('challengeAccepted', username);
  }
  else {
    socket.emit('challengeDeclined', username);
  }
});

// On challenge declined
socket.on('challengeDeclined', function(username) {
  var message = document.getElementById("message");
  message.innerHTML = username + " has declined your challenge.";
});

// On game in progress
socket.on('gameInProgress', function() {
  var message = document.getElementById("message");
  message.innerHTML = "A game is in progress. Please try again later.";
});

// On load game page
socket.on('loadGamePage', function(htmlString) {
  console.log("loading game page");
  var content = document.getElementById("content");
  content.innerHTML = htmlString;
  initGame();
});

// On game won
socket.on('winner', function() {
  clearInterval(window.myVar);
  clearInterval(window.myVar2);
  gameInProgress = false;
});

socket.on('disconnect', function () {
  window.location.href = "index.html";
});

/* ------------------- ERROR HANDLERS ----------------------------- */

// Error verifying username/password
socket.on('loginError', function() {
  console.log("Warning: error on verify");

  var message = document.getElementById("message");
  message.innerHTML = "*There was an error while verifying your username/password. Please reload the page and try again.";

  document.getElementById("loginForm").reset();
});

// Error creating a new account
socket.on('newAccountError', function() {
  console.log("Warning: error on create new account");

  var message = document.getElementById("message");
  message.innerHTML = "*There was an error while creating a new account. Please reload the page and try again.";

  document.getElementById("accountForm").reset();
});

// Error during game play
socket.on('gamePlayError', function() {
  console.log("Warning: error during game play");

  if (gameInProgress) {
    clearInterval(window.myVar);
    clearInterval(window.myVar2);

    var message = "*Your opponent experienced an error during gameplay.";
    socket.emit('loadLobbyPage', message);

    gameInProgress = false;
  }
  else {
    var message = document.getElementById("message");
    message.innerHTML = "*Your opponent experienced an error during gameplay.";
  }
});

/* ------------------- GAME ENGINE ----------------------------- */

// Prepare gameplay variables
var linex;
var linex2;
var liney;
var liney2;
var c;
var ctx;
var ctx2;
var myVar;
var myVar2;
var direction = "right";
var direction2 = "left";
var arrayx = [];
var arrayy = [];
var gameInProgress = false;

// Start the game
function initGame() {
  linex = 0;
  linex2 = 1200;
  liney = 350;
  liney2 = 350;
  c = document.getElementById("canvasId");
  ctx = c.getContext("2d");
  ctx2 = c.getContext("2d");
  ctx.lineWidth = 1;
  ctx2.lineWidth = 1;
  ctx.strokeStyle = "#CC66FF";
  ctx2.strokeStyle = "#7FFF00";
  direction = "right";
  direction2 = "left";
  arrayx = [];
  arrayy = [];

  gameInProgress = true;
  ctx.rect(0,0,1200,700);
  ctx.fillStyle="black";
  ctx.fill();
  window.myVar = setInterval(function(){drawLine(ctx, linex, liney)}, 4);
  window.myVar2 = setInterval(function(){drawLine2(ctx2, linex2, liney2)}, 10);
}

// Draw player line on canvas
function drawLine(ctx, linex, liney) {
  for (i = 0; i < window.arrayx.length; ++i) {
    if (((linex == window.arrayx[i]) && (liney == window.arrayy[i])) || (linex < 0) || (linex > 1200) || (liney < 0) || (liney > 700)) {
     socket.emit('lose');
     clearInterval(window.myVar);
     clearInterval(window.myVar2);
     gameInProgress = false;

     var message = "You Just Lost!";
     socket.emit('loadLobbyPage', message);
    }
  }
  window.arrayx[arrayx.length] = linex;
  window.arrayy[arrayy.length] = liney;

  var updatex = 0;
  var updatey = 0;

  ctx.moveTo(linex,liney);
  if (direction == "right") {
    updatex = 1;
    updatey = 0;
  }
  if (direction == "left") {
    updatex = -1;
    updatey = 0;
  }
  if (direction == "down") {
    updatex = 0;
    updatey = 1;
  }
  if (direction == "up") {
    updatex = 0;
    updatey = -1;
  }

  linex+= updatex;
  liney+= updatey;
  window.linex+=updatex;
  window.liney+=updatey;
  ctx.lineTo(linex,liney);
  ctx.stroke();
}

// Draw opponent line on canvas
function drawLine2(ctx, linex, liney) {
  var updatex = 0;
  var updatey = 0;

  window.arrayx[arrayx.length] = linex;
  window.arrayy[arrayy.length] = liney;

  ctx.moveTo(linex,liney);
  if (direction2 == "right") {
    updatex = 1;
    updatey = 0;
  }
  if (direction2 == "left") {
    updatex = -1;
    updatey = 0;
  }
  if (direction2 == "down") {
    updatex = 0;
    updatey = 1;
  }
  if (direction2 == "up") {
    updatex = 0;
    updatey = -1;
  }
  linex2+= updatex;
  liney2+= updatey;

  window.linex2+=updatex;
  window.liney2+=updatey;
  ctx2.lineTo(linex2,liney2);
  ctx2.stroke();
}

// Handle arrow keys
document.onkeydown = checkKey;
function checkKey(e) {

  if(gameInProgress) {

    e = e || window.event;

    if (e.keyCode == '38') {
      // up arrow
      if (window.direction != "down") {
        window.direction = "up";
        socket.emit('turn', "up");
      }
    }
    else if (e.keyCode == '40') {
      // down arrow
      if (window.direction != "up") {
        window.direction = "down";
        socket.emit('turn', "down");
      }
    }
    else if (e.keyCode == '37') {
      // left arrow
      if (window.direction != "right") {
        window.direction = "left";
        socket.emit('turn', "right");
      }
    }
    else if (e.keyCode == '39') {
      // right arrow
      if (window.direction != "left") {
        window.direction = "right";
        socket.emit('turn', "left");
      }
    }
  }
}

// Handler for opponent turn
socket.on('turn',function(direction){
  window.direction2 = direction;
});
