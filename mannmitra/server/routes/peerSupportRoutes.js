import { Router } from "express";
import {
  completeVolunteerTraining,
  createPeerGroup,
  joinPeerGroup,
  listEscalations,
  listGroupMessages,
  listPeerGroups,
  postGroupMessage,
  recruitVolunteer,
  requestOneToOneMatch,
  volunteerEscalate,
} from "../controllers/peerSupportController.js";
import { userAuth } from "../middleware/userAuth.js";
import { adminAuth } from "../middleware/adminAuth.js";

const router = Router();

router.get("/groups", userAuth, listPeerGroups);
router.post("/groups", adminAuth, createPeerGroup);
router.post("/groups/:groupId/join", userAuth, joinPeerGroup);
router.get("/groups/:groupId/messages", userAuth, listGroupMessages);
router.post("/groups/:groupId/messages", userAuth, postGroupMessage);
router.post("/groups/:groupId/escalate", adminAuth, volunteerEscalate);
router.post("/match-listener", userAuth, requestOneToOneMatch);

router.post("/volunteers/recruit", adminAuth, recruitVolunteer);
router.patch(
  "/volunteers/:volunteerId/training-complete",
  adminAuth,
  completeVolunteerTraining,
);
router.get("/escalations", adminAuth, listEscalations);

export default router;
