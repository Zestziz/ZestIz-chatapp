import User from "../models/user.model.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

// Send a friend request
export async function sendFriendRequest(req, res) {
  try {
    const senderId = req.user._id;
    const { id: targetId } = req.params;

    if (senderId.toString() === targetId) {
      return res.status(400).json({ message: "You cannot send a friend request to yourself" });
    }

    const targetUser = await User.findById(targetId);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if already friends
    if (req.user.friends?.some((f) => f.toString() === targetId)) {
      return res.status(400).json({ message: "You are already friends with this user" });
    }

    // Check if a request already exists
    const existingIncoming = targetUser.friendRequests.find(
      (r) => r.sender.toString() === senderId.toString() && r.status === "pending"
    );
    if (existingIncoming) {
      return res.status(400).json({ message: "Friend request already sent" });
    }

    // Check if target user has already sent a request to current user
    const pendingFromTarget = req.user.friendRequests.find(
      (r) => r.sender.toString() === targetId && r.status === "pending"
    );
    if (pendingFromTarget) {
      // Auto-accept if target already sent a request
      pendingFromTarget.status = "accepted";
      req.user.friends.push(targetId);
      targetUser.friends.push(senderId);

      await Promise.all([req.user.save(), targetUser.save()]);

      const targetSocketId = getReceiverSocketId(targetId);
      if (targetSocketId) {
        io.to(targetSocketId).emit("friendRequestAccepted", {
          user: {
            _id: req.user._id,
            fullName: req.user.fullName,
            profilePic: req.user.profilePic,
          },
        });
      }

      return res.status(200).json({ message: "Friend request accepted automatically as they had already sent one", status: "accepted" });
    }

    // Add new pending request to targetUser
    targetUser.friendRequests.push({
      sender: senderId,
      status: "pending",
      createdAt: new Date(),
    });

    await targetUser.save();

    // Emit socket event if target is online
    const receiverSocketId = getReceiverSocketId(targetId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newFriendRequest", {
        sender: {
          _id: req.user._id,
          fullName: req.user.fullName,
          profilePic: req.user.profilePic,
        },
        createdAt: new Date(),
      });
    }

    res.status(200).json({ message: "Friend request sent successfully" });
  } catch (error) {
    console.error("Error in sendFriendRequest:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Accept a friend request
export async function acceptFriendRequest(req, res) {
  try {
    const userId = req.user._id;
    const { id: senderId } = req.params;

    const senderUser = await User.findById(senderId);
    if (!senderUser) {
      return res.status(404).json({ message: "Sender user not found" });
    }

    // Find pending request in current user's friendRequests
    const requestIndex = req.user.friendRequests.findIndex(
      (r) => r.sender.toString() === senderId && r.status === "pending"
    );

    if (requestIndex === -1) {
      return res.status(404).json({ message: "No pending friend request found from this user" });
    }

    // Mark request as accepted or remove
    req.user.friendRequests[requestIndex].status = "accepted";

    // Add to friends lists if not already present
    if (!req.user.friends.some((f) => f.toString() === senderId)) {
      req.user.friends.push(senderId);
    }
    if (!senderUser.friends.some((f) => f.toString() === userId.toString())) {
      senderUser.friends.push(userId);
    }

    await Promise.all([req.user.save(), senderUser.save()]);

    // Realtime notification to sender
    const senderSocketId = getReceiverSocketId(senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("friendRequestAccepted", {
        user: {
          _id: req.user._id,
          fullName: req.user.fullName,
          profilePic: req.user.profilePic,
        },
      });
    }

    res.status(200).json({ message: "Friend request accepted successfully" });
  } catch (error) {
    console.error("Error in acceptFriendRequest:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Reject a friend request
export async function rejectFriendRequest(req, res) {
  try {
    const { id: senderId } = req.params;

    const requestIndex = req.user.friendRequests.findIndex(
      (r) => r.sender.toString() === senderId && r.status === "pending"
    );

    if (requestIndex === -1) {
      return res.status(404).json({ message: "No pending friend request found from this user" });
    }

    req.user.friendRequests[requestIndex].status = "rejected";
    await req.user.save();

    res.status(200).json({ message: "Friend request rejected" });
  } catch (error) {
    console.error("Error in rejectFriendRequest:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Cancel a sent friend request
export async function cancelFriendRequest(req, res) {
  try {
    const senderId = req.user._id;
    const { id: targetId } = req.params;

    const targetUser = await User.findById(targetId);
    if (!targetUser) {
      return res.status(404).json({ message: "Target user not found" });
    }

    targetUser.friendRequests = targetUser.friendRequests.filter(
      (r) => !(r.sender.toString() === senderId.toString() && r.status === "pending")
    );

    await targetUser.save();

    // Emit event to target
    const targetSocketId = getReceiverSocketId(targetId);
    if (targetSocketId) {
      io.to(targetSocketId).emit("friendRequestCancelled", {
        senderId: senderId.toString(),
      });
    }

    res.status(200).json({ message: "Friend request cancelled" });
  } catch (error) {
    console.error("Error in cancelFriendRequest:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Remove/Unfriend a user
export async function removeFriend(req, res) {
  try {
    const userId = req.user._id;
    const { id: friendId } = req.params;

    const friendUser = await User.findById(friendId);
    if (!friendUser) {
      return res.status(404).json({ message: "User not found" });
    }

    req.user.friends = req.user.friends.filter((f) => f.toString() !== friendId);
    friendUser.friends = friendUser.friends.filter((f) => f.toString() !== userId.toString());

    await Promise.all([req.user.save(), friendUser.save()]);

    const friendSocketId = getReceiverSocketId(friendId);
    if (friendSocketId) {
      io.to(friendSocketId).emit("friendRemoved", {
        userId: userId.toString(),
      });
    }

    res.status(200).json({ message: "Friend removed successfully" });
  } catch (error) {
    console.error("Error in removeFriend:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Get pending friend requests (incoming & outgoing)
export async function getPendingRequests(req, res) {
  try {
    const userId = req.user._id;

    // Incoming requests
    const currentUser = await User.findById(userId)
      .populate({
        path: "friendRequests.sender",
        select: "_id fullName email profilePic",
      })
      .select("friendRequests");

    const incoming = (currentUser?.friendRequests || [])
      .filter((r) => r.status === "pending" && r.sender)
      .map((r) => ({
        _id: r._id,
        sender: r.sender,
        status: r.status,
        createdAt: r.createdAt,
      }));

    // Outgoing requests (where current user is sender)
    const outgoingUsers = await User.find({
      "friendRequests": {
        $elemMatch: {
          sender: userId,
          status: "pending",
        },
      },
    }).select("_id fullName email profilePic friendRequests");

    const outgoing = [];
    for (const u of outgoingUsers) {
      const reqItem = u.friendRequests.find(
        (r) => r.sender.toString() === userId.toString() && r.status === "pending"
      );
      if (reqItem) {
        outgoing.push({
          _id: reqItem._id,
          receiver: {
            _id: u._id,
            fullName: u.fullName,
            email: u.email,
            profilePic: u.profilePic,
          },
          status: reqItem.status,
          createdAt: reqItem.createdAt,
        });
      }
    }

    res.status(200).json({ incoming, outgoing });
  } catch (error) {
    console.error("Error in getPendingRequests:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Get friends list
export async function getFriends(req, res) {
  try {
    const user = await User.findById(req.user._id).populate({
      path: "friends",
      select: "_id fullName email profilePic privacySettings",
    });

    res.status(200).json(user.friends || []);
  } catch (error) {
    console.error("Error in getFriends:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Get mutual friends count
export async function getMutualFriendsCount(req, res) {
  try {
    const userId = req.user._id;
    const { id: targetId } = req.params;

    const [user, targetUser] = await Promise.all([
      User.findById(userId).select("friends"),
      User.findById(targetId).select("friends"),
    ]);

    if (!targetUser) {
      return res.status(404).json({ message: "Target user not found" });
    }

    const userFriends = (user?.friends || []).map((id) => id.toString());
    const targetFriends = (targetUser?.friends || []).map((id) => id.toString());

    const mutualFriendIds = userFriends.filter((id) => targetFriends.includes(id));

    res.status(200).json({
      count: mutualFriendIds.length,
      mutualFriendIds,
    });
  } catch (error) {
    console.error("Error in getMutualFriendsCount:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Block a user
export async function blockUser(req, res) {
  try {
    const userId = req.user._id;
    const { id: targetId } = req.params;

    if (userId.toString() === targetId) {
      return res.status(400).json({ message: "You cannot block yourself" });
    }

    const targetUser = await User.findById(targetId);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if already blocked
    if (req.user.blockedUsers.includes(targetId)) {
      return res.status(400).json({ message: "User already blocked" });
    }

    // Add target to logged-in user's blockedUsers
    req.user.blockedUsers.push(targetId);

    // Remove from friends
    req.user.friends = req.user.friends.filter((f) => f.toString() !== targetId);
    targetUser.friends = targetUser.friends.filter((f) => f.toString() !== userId.toString());

    // Clear pending friend requests between them
    req.user.friendRequests = req.user.friendRequests.filter(
      (r) => r.sender.toString() !== targetId
    );
    targetUser.friendRequests = targetUser.friendRequests.filter(
      (r) => r.sender.toString() !== userId.toString()
    );

    await Promise.all([req.user.save(), targetUser.save()]);

    // Emit socket event to target user to update active state
    const targetSocketId = getReceiverSocketId(targetId);
    if (targetSocketId) {
      io.to(targetSocketId).emit("userBlocked", {
        blockerId: userId.toString(),
      });
    }

    res.status(200).json({ message: "User blocked successfully" });
  } catch (error) {
    console.error("Error in blockUser:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Unblock a user
export async function unblockUser(req, res) {
  try {
    const userId = req.user._id;
    const { id: targetId } = req.params;

    req.user.blockedUsers = req.user.blockedUsers.filter((u) => u.toString() !== targetId);
    await req.user.save();

    res.status(200).json({ message: "User unblocked successfully" });
  } catch (error) {
    console.error("Error in unblockUser:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Get blocked users
export async function getBlockedUsers(req, res) {
  try {
    const user = await User.findById(req.user._id).populate({
      path: "blockedUsers",
      select: "_id fullName email profilePic",
    });

    res.status(200).json(user.blockedUsers || []);
  } catch (error) {
    console.error("Error in getBlockedUsers:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Update privacy settings
export async function updatePrivacySettings(req, res) {
  try {
    const { messagePermission } = req.body;

    if (!["everyone", "friends_only"].includes(messagePermission)) {
      return res.status(400).json({ message: "Invalid message permission setting" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { "privacySettings.messagePermission": messagePermission },
      { new: true }
    ).select("-clerkId");

    res.status(200).json({
      privacySettings: updatedUser.privacySettings,
      message: "Privacy settings updated successfully",
    });
  } catch (error) {
    console.error("Error in updatePrivacySettings:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}
