export const setupVideoSignaling = (io) => {
  io.on("connection", (socket) => {
    socket.on("join-room", (roomId) => {
      socket.join(roomId);
      const peerCount = io.sockets.adapter.rooms.get(roomId)?.size || 1;
      socket.emit("joined-room", { roomId, peerCount });
      socket.to(roomId).emit("peer-joined", socket.id);
    });
    socket.on("offer", ({ roomId, offer }) =>
      socket.to(roomId).emit("offer", { offer, sender: socket.id }),
    );
    socket.on("answer", ({ roomId, answer }) =>
      socket.to(roomId).emit("answer", { answer, sender: socket.id }),
    );
    socket.on("ice-candidate", ({ roomId, candidate }) =>
      socket.to(roomId).emit("ice-candidate", { candidate, sender: socket.id }),
    );
    socket.on("leave-room", (roomId) => {
      socket.leave(roomId);
      socket.to(roomId).emit("peer-left", socket.id);
    });
  });
};
