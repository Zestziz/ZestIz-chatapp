import express from "express";
import {
  getConversationsForSidebar,
  getMessages,
  searchMessages,
  getUsersForSidebar,
  editMessage,
  deleteMessage,
  markMessagesRead,
  reactToMessage,
  sendMessage,
} from "../controllers/message.controller.js";
import { closePoll, createPrivatePoll, votePoll } from "../controllers/poll.controller.js";
import { getPinnedMessages, updatePin } from "../controllers/pin.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = express.Router();

router.use(protectRoute);

router.get("/users", getUsersForSidebar);
router.get("/conversations", getConversationsForSidebar);
router.get("/search/:userId", searchMessages);
router.post("/:id/read", markMessagesRead);
router.post("/:messageId/reaction", reactToMessage);
router.post("/:messageId/poll/vote", votePoll);
router.patch("/:messageId/poll/close", closePoll);
router.patch("/:messageId/pin", updatePin);
router.patch("/:messageId", editMessage);
router.delete("/:messageId", deleteMessage);
router.get("/:id", getMessages);
router.get("/pinned/:userId", getPinnedMessages);
router.post("/send/:id", upload.single("media"), sendMessage);
router.post("/:id/poll", createPrivatePoll);

export default router;