import express from "express";
import { checkAuth, getProfile, updateProfile } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = express.Router();

router.get("/check", protectRoute, checkAuth);
router.get("/profile/:id", protectRoute, getProfile);
router.patch("/profile", protectRoute, upload.single("profilePic"), updateProfile);

export default router;