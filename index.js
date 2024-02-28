import { Server } from "socket.io";
import { createServer } from "http";

const server = createServer();
const io = new Server(server, {
  cors: {
    origin: true,
  },
});
const allUsers = {};
const allRooms = new Set();
io.on("connection", (socket) => {
  allUsers[socket.id] = {
    socket,
    online: true,
  };

  socket.on("request_to_play", (data) => {
    allUsers[socket.id].playerName = data.playerName;
    const currentUser = allUsers[socket.id];
    let oppenentPlayer;
    for (const key in allUsers) {
      const user = allUsers[key];
      if (user.online && !user.playing && user.socket.id !== socket.id) {
        oppenentPlayer = user;
      }
    }
    if (oppenentPlayer) {
      currentUser.playing = true;
      oppenentPlayer.playing = true;
      allRooms.add({
        player1: currentUser,
        player2: oppenentPlayer,
      });
      //! current User

      currentUser.socket.emit("OpponentFound", {
        playerName: oppenentPlayer.playerName,
        playingAs: "circle",
      });

      // ! opponent user

      oppenentPlayer.socket.emit("OpponentFound", {
        playerName: currentUser.playerName,
        playingAs: "cross",
      });

      currentUser.socket.on("playerMoveFromClient", (data) => {
        oppenentPlayer.socket.emit("playerMoveFromServer", data);
      });
      oppenentPlayer.socket.on("playerMoveFromClient", (data) => {
        currentUser.socket.emit("playerMoveFromServer", data);
      });

    
    } else {
      socket.emit("OpponentNotFound");
    }
  });

  socket.on("disconnect", () => {
    const currentUser = allUsers[socket.id];
    currentUser.online = false;
    currentUser.playing = false;
  
    allRooms.forEach((dets) => {
      const { player1, player2 } = dets;
      if (player1.socket.id === socket.id) {
        player2.socket.emit("OpponentLeftMatch");
      }

      if (player2.socket.id === socket.id) {
        player1.socket.emit("OpponentLeftMatch");
      }
    });
  });
});

server.listen(3000, () => console.log("server is running"));
