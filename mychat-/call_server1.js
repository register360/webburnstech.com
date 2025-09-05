// npm i express socket.io
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*"} // tighten for prod
});

// serve your single-file client
app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {
  let joinedRoom = null;

  socket.on("join", ({ roomId }) => {
    const room = io.sockets.adapter.rooms.get(roomId);
    const participants = room ? room.size : 0;
    
    if (participants >= 6) {
      socket.emit("full");
      return;
    }
    
    socket.join(roomId);
    joinedRoom = roomId;
    
    // Get list of all peer IDs in the room (excluding the current socket)
    const peers = Array.from(io.sockets.adapter.rooms.get(roomId) || [])
      .filter(id => id !== socket.id);
    
    socket.emit("joined", { 
      participants: participants + 1,
      peers 
    });
    
    // Notify other peers about the new user
    socket.to(roomId).emit("peer-joined", socket.id);
  });

  // Relay of SDP/ICE between specific peers
  socket.on("offer", ({ roomId, target, sdp }) => {
    socket.to(target).emit("offer", { from: socket.id, sdp });
  });
  
  socket.on("answer", ({ roomId, target, sdp }) => {
    socket.to(target).emit("answer", { from: socket.id, sdp });
  });
  
  socket.on("ice-candidate", ({ roomId, target, candidate }) => {
    socket.to(target).emit("ice-candidate", { from: socket.id, candidate });
  });

  socket.on("hangup", ({ roomId }) => {
    socket.to(roomId).emit("peer-left", socket.id);
  });
  
  socket.on("leave", ({ roomId }) => {
    socket.leave(roomId);
    socket.to(roomId).emit("peer-left", socket.id);
  });

  socket.on("disconnect", () => {
    if (joinedRoom) {
      socket.to(joinedRoom).emit("peer-left", socket.id);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Signaling server on http://localhost:${PORT}`));
