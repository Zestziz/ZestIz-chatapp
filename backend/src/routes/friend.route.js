import express from "express";
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  removeFriend,
  getPendingRequests,
  getFriends,
  getMutualFriendsCount,
  blockUser,
  unblockUser,
  getBlockedUsers,
  updatePrivacySettings,
} from "../controllers/friend.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protectRoute);

router.get("/", getFriends);
router.get("/pending", getPendingRequests);
router.get("/blocked", getBlockedUsers);
router.get("/mutual/:id", getMutualFriendsCount);

router.post("/request/:id", sendFriendRequest);
router.post("/accept/:id", acceptFriendRequest);
router.post("/reject/:id", rejectFriendRequest);
router.post("/cancel/:id", cancelFriendRequest);
router.post("/remove/:id", removeFriend);
router.post("/block/:id", blockUser);
router.post("/unblock/:id", unblockUser);

router.put("/privacy", updatePrivacySettings);

export default router;
