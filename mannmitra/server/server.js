/* Load .env before any other app imports — otherwise services read empty process.env. */
import "dotenv/config";
import http from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { seedDefaultCourses } from "./seed/seedDefaultCourses.js";
import { setupVideoSignaling } from "./socket/videoSignaling.js";
const port = process.env.PORT || 5000;
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || "*" },
});
setupVideoSignaling(io);

connectDB()
  .then(async () => {
    try {
      await seedDefaultCourses();
    } catch (e) {
      console.warn("seedDefaultCourses:", e?.message || e);
    }
    server.listen(port, () => console.log(`Server running on ${port}`));
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
