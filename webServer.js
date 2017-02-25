/* ------------------- WEB SERVER ----------------------------- */

var io = require('socket.io').listen(5000);
console.log("server is starting up");

// Array of socket connections
var connectedClients = new Array();

// Object to map usernames to sockets
var usernameSocketPairs = {};

// Array of logged in users
var activeUsers = new Array();

// Sockets for battle
var battleSocket1 = null;
var battleSocket2 = null;

// Prepare info for mysql database
var mysql = require('mysql');
var connection = mysql.createConnection({
  host : 'localhost',
  user : 'guest',
  password : 'guest',
  database: 'credentials'
});

// Connect to mysql database
connection.connect(function(error) {
  if(error) {
    console.error('error connecting: ' + error.stack);
    return;
  }
  else {
    console.log('connected to mysql server as id ' + connection.threadId);
  }
});

// Verify username and password from mysql database
function verifyUser(socket, username, password) {
  var sqlString = "SELECT * FROM `credentials` WHERE `username` =" + connection.escape(username) +" AND `password` =" + connection.escape(password);
  connection.query(sqlString, function(error, results, fields) {

    // If there was an error
    if (error) {
      console.error('error querying data: ' + error.stack);
      socket.emit('loginError');
    }
    // If there was no error and username/password were found
    else if (results != "") {
      // Check if user is already logged in
      if (activeUsers.indexOf(username) != -1) {
        console.log("user: " + username + " is already logged in");
        socket.emit('alreadyLoggedIn');
      }
      // If all is well
      else {
        console.log("user: " + username + " has logged in successfully");
        activeUsers.push(username);
        usernameSocketPairs[username] = socket;
        socket.emit('loginSuccess');
        loadLobbyPage(socket, "");
        updateUsersList();
      }
    }
    // If there was no error but username/password failed
    else {
      console.log("incorrect username/password: " + username + "/" + password);
      socket.emit('loginFailed');
    }

  });
}

function createNewAccount(socket, username, password) {
  var sqlString1 = "SELECT * FROM `credentials` WHERE `username` =" + connection.escape(username);
  connection.query(sqlString1, function(error, results, fields) {

    // If there was an error
    if (error) {
      console.error('error querying data: ' + error.stack);
      socket.emit('newAccountError');
    }
    // If that username is available
    else if (results == "") {
      var sqlString2 = "INSERT INTO `credentials`.`credentials` (`username`, `password`) VALUES (" + connection.escape(username) + ", " + connection.escape(password) + ")";
      connection.query(sqlString2, function(error, results) {

        // If there was an error
        if (error) {
          console.error('error inserting data: ' + error.stack);
          socket.emit('newAccountError');
        }
        // If the account was created successfully
        else {
          console.log("account created successfully with name: " + username);
          socket.emit('newAccountCreated');
        }

      });
    }
    // If the username is not available
    else {
      console.log("username: " + username + " was unavailable");
      socket.emit('usernameUnavailable');
    }

  });
}

function loadLobbyPage(socket, message) {
  console.log("loading lobby page");
  if (message == null) {
    message = "";
  }
  var htmlString =  "<div id = 'usersBox'> Active Users <div id = usersList> </div>" +
                    "<div id = message>" + message + "</div> </div> <div id = 'info'> Welcome to Light Bike" +
                    "<div id ='description'> </div> <img id = 'bike' src='resources/images/bike.png'> </img> </div>";
  socket.emit('loadLobbyPage', htmlString);
  updateUsersList();
}

function loadNewAccountPage(socket) {
  console.log("loading new account page");
  var htmlString =  "<div class = 'box'> <div class = 'boxTitle'> Create a New Account </div>" +
                    "<br> <br> <form id = 'accountForm' class = 'inputForm' action = 'javascript:newAccount();'>" +
                    "Desired Username: <input type='text' name='newUsername'> <br> <br> <br> Desired Password:" +
                    "<input type='password' name='newPassword1'> <br> Retype Password: <input type='password' name='newPassword2'>" +
                    "<br> <br> <br> <input type='submit' id='submit' value='Create Account' /> </form> <div id = 'message'> </div> </div>";
  socket.emit('loadNewAccountPage', htmlString);
}

// When two users are ready to battle
function loadGamePage(socket1, socket2) {
  console.log("two clients are beginning a game");

  battleSocket1 = socket1;
  battleSocket2 = socket2;

  var htmlString =  "<div id='canvasBox'> <canvas id='canvasId' width='1200' height='700' style='border:1px solid #000000'>" +
                    "</canvas> </div>";

  socket1.emit('loadGamePage', htmlString);
  socket2.emit('loadGamePage', htmlString);
}

// Whenever a user connects or disconnects, send updated lists
function updateUsersList() {
  console.log("sending updated users list to all connected clients");
  var htmlString = "<ul id='users'>";
  for (var i = 0; i < activeUsers.length; i++) {
    htmlString = htmlString + "<li> <a href='#' onclick='challengeUser(\"" + activeUsers[i] + "\");'>" + activeUsers[i] + "</a> </li>";
  }
  htmlString = htmlString + "</ul>";

  for (var j = 0; j < connectedClients.length; j++) {
    connectedClients[j].emit('updateUsersList', htmlString);
  }
}

// When a client logs out or disconnects
function disconnect(username, socket) {
  // Remove user from list of active users
  var index1 = activeUsers.indexOf(username);
  activeUsers.splice(index1, 1);

  // Remove socket from list of connected clients
  var index2 = connectedClients.indexOf(socket);
  connectedClients.splice(index2, 1);

  // Check if client was currently in game
  if (socket == battleSocket1) {
    battleSocket2.emit('gamePlayError');
    battleSocket1 = null;
    battleSocket2 = null;
  }
  else if (socket == battleSocket2) {
    battleSocket1.emit('gamePlayError');
    battleSocket1 = null;
    battleSocket2 = null;
  }

  if (connectedClients.length > 0) {
    updateUsersList();
  }
  else {
    console.log("no clients connected");
  }
}

/* ------------------- NEW SOCKET CONNECTION ----------------------------- */

// Event handler for new socket connection
io.sockets.on('connection', function(socket) {

  // Add client to array
  connectedClients.push(socket);

  // Conencted to client
  socket.emit('newConnection');
  socket.on('newConnection', function() {
    console.log("connected to new client");
    console.log("total clients connected: " + connectedClients.length);
  });

  // Variable for client username
  var clientUsername;

  // Handler for login verification request from client
  socket.on('verifyUser', function(username, password) {
    console.log(username + " is trying to log in");
    verifyUser(socket, username, password);

    // Set client username
    clientUsername = username;
  });

  // Handler for load new account page
  socket.on('loadNewAccountPage', function() {
    console.log("loading new account page");
    loadNewAccountPage(socket);
  });

  // Handler for new account request from client
  socket.on('newAccount', function(username, password) {
    console.log("trying to create a new account");
    createNewAccount(socket, username, password);
  });

  // Handler for load lobby page
  socket.on('loadLobbyPage', function(message) {
    loadLobbyPage(socket, message);
  })

  // Handler for challenge user
  socket.on('challengeUser', function(username) {
    if (battleSocket1 == null) {
      usernameSocketPairs[username].emit('newChallenge', clientUsername);
    }
    else {
      socket.emit('gameInProgress');
    }
  });

  // Handler for challenge accepted
  socket.on('challengeAccepted', function(username) {
    if (battleSocket1 == null) {
      loadGamePage(socket, usernameSocketPairs[username]);
    }
    else {
      socket.emit('gameInProgress');
      usernameSocketPairs[username].emit('gameInProgress');
    }
  });

  // Handler for challenge declined
  socket.on('challengeDeclined', function(username) {
    usernameSocketPairs[username].emit('challengeDeclined', clientUsername);
  });

  // Gameplay handler for user loss
  socket.on('lose', function() {
    if (socket == battleSocket1) {
      battleSocket2.emit('winner');
      loadLobbyPage(battleSocket2, "You Just Won!");
    }
    else if (socket == battleSocket2) {
      battleSocket1.emit('winner');
      loadLobbyPage(battleSocket1, "You Just Won!");
    }
    else {
      socket.emit('gamePlayError');
    }

    // Reset battle sockets
    battleSocket1 = null;
    battleSocket2 = null;
  });

  // Gameplay handler for user turn
  socket.on('turn', function(direction) {
    if (socket == battleSocket1) {
      battleSocket2.emit('turn', direction);
    }
    else {
      battleSocket1.emit('turn', direction);
    }
  });

  // Handler for user logout
  socket.on('logout', function() {
    disconnect(clientUsername, socket);
  });

  // Handler for user disconnect
  socket.on('disconnect', function () {
    console.log(clientUsername + " has disconnected");
    disconnect(clientUsername, socket);
  });

});
