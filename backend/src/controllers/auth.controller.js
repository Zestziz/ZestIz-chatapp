import mongoose from "mongoose";
import User from "../models/user.model.js";
import { hasImageKitConfig, uploadChatMedia } from "../lib/imagekit.js";

function profileFields(user) {
    return {
        _id: user._id,
        fullName: user.fullName,
        username: user.username || "",
        bio: user.bio || "",
        profilePic: user.profilePic || "",
        lastSeen: user.lastSeen || null,
    };
}

export async function checkAuth(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ message: "Unauthorized"});
    }

    res.status(200).json(req.user);
}

export async function getProfile(req, res) {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid profile ID" });
    }

    const [user, currentUser] = await Promise.all([
        User.findById(id).select("_id fullName username bio profilePic lastSeen friends blockedUsers friendRequests"),
        User.findById(req.user._id).select("friends blockedUsers friendRequests"),
    ]);
    if (!user) return res.status(404).json({ message: "User not found" });

    const userId = String(user._id);
    const currentId = String(req.user._id);
    const isFriend = currentUser.friends.some((friendId) => String(friendId) === userId);
    const isBlocked = currentUser.blockedUsers.some((blockedId) => String(blockedId) === userId);
    const isBlockedBy = user.blockedUsers.some((blockedId) => String(blockedId) === currentId);
    const hasPendingRequest = user.friendRequests.some(
        (request) => String(request.sender) === currentId && request.status === "pending",
    ) || currentUser.friendRequests.some(
        (request) => String(request.sender) === userId && request.status === "pending",
    );

    return res.status(200).json({
        ...profileFields(user),
        isFriend,
        isBlocked,
        isBlockedBy,
        hasPendingRequest,
        isOnline: false,
    });
}

export async function updateProfile(req, res) {
    const username = typeof req.body.username === "string" ? req.body.username.trim().toLowerCase() : "";
    const fullName = typeof req.body.fullName === "string" ? req.body.fullName.trim() : "";
    const bio = typeof req.body.bio === "string" ? req.body.bio.trim() : "";

    if (!/^[a-z0-9_]{3,24}$/.test(username)) {
        return res.status(400).json({ message: "Username must be 3-24 characters using letters, numbers, or underscores" });
    }
    if (fullName.length < 2 || fullName.length > 80) {
        return res.status(400).json({ message: "Full name must be 2-80 characters" });
    }
    if (bio.length > 280) return res.status(400).json({ message: "Bio must be 280 characters or fewer" });

    const conflict = await User.findOne({ username, _id: { $ne: req.user._id } }).select("_id");
    if (conflict) return res.status(409).json({ message: "Username is already taken" });

    const updates = { username, fullName, bio };
    if (req.file) {
        if (!req.file.mimetype.startsWith("image/")) {
            return res.status(400).json({ message: "Profile picture must be an image" });
        }
        if (!hasImageKitConfig()) return res.status(500).json({ message: "Image upload is not configured" });
        updates.profilePic = await uploadChatMedia(req.file);
    }

    const updatedUser = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    return res.status(200).json(profileFields(updatedUser));
}