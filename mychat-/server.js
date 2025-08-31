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

// serve your single-file client as / (or point to your existing mychat.html)
app.use(express.static(path.join(__dirname, "public"))); // put mychat.html in /public

io.on("connection", (socket) => {
  let joinedRoom = null;

  socket.on("join", ({ roomId }) => {
    const room = io.sockets.adapter.rooms.get(roomId);
    const participants = room ? room.size : 0;
    if (participants >= 2) {
      socket.emit("full");
      return;
    }
    socket.join(roomId);
    joinedRoom = roomId;
    const updated = io.sockets.adapter.rooms.get(roomId)?.size || 1;
    socket.emit("joined", { participants: updated });
    socket.to(roomId).emit("peer-joined");
  });

  // Simple relay of SDP/ICE between the two peers
  socket.on("offer", ({ roomId, sdp }) => socket.to(roomId).emit("offer", { sdp }));
  socket.on("answer", ({ roomId, sdp }) => socket.to(roomId).emit("answer", { sdp }));
  socket.on("ice-candidate", ({ roomId, candidate }) =>
    socket.to(roomId).emit("ice-candidate", { candidate })
  );

  socket.on("hangup", ({ roomId }) => socket.to(roomId).emit("peer-left"));
  socket.on("leave", ({ roomId }) => {
    socket.leave(roomId);
    socket.to(roomId).emit("peer-left");
  });

  socket.on("disconnect", () => {
    if (joinedRoom) socket.to(joinedRoom).emit("peer-left");
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Signaling server on http://localhost:${PORT}`));
