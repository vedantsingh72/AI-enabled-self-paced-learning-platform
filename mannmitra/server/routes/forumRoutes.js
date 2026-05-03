import { Router } from "express";
import {
  createPost,
  getPosts,
  addReply,
} from "../controllers/forumController.js";
import { anonymousAuth } from "../middleware/anonymousAuth.js";
const r = Router();
r.get("/posts", anonymousAuth, getPosts);
r.post("/post", anonymousAuth, createPost);
r.post("/post/:id/reply", anonymousAuth, addReply);
export default r;
