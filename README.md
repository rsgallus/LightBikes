# Light Bikes with Node.js

This project is a simple example of a node.js web server/client. A node.js http server loads pages, while another node.js backend uses WebSockets to handle clients and serve games.

### Getting Started

In order to run this project, you will need node.js installed, and the following modules:
  * socket.io
  * mysql

### Details

The light bikes game itself is a simple JavaScript canvas game. The server and client are both written in node.js using WebSockets to communicate. Users must login, or create a new account. Account credentials are stored in a simple mysql database. After logging in, users are placed in a lobby where they can see other connected players. The server maintains a list of connected sockets, which is used to pair two players in a game. In a game, clients send a message to the server any time they turn.
