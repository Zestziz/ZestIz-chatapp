import mongoose from "mongoose";

const pollSchema = new mongoose.Schema(
  {
    question: { type: String, trim: true, maxlength: 240, required: true },
    options: [{
      text: { type: String, trim: true, maxlength: 120, required: true },
      votes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    }],
    isClosed: { type: Boolean, default: false },
    closedAt: { type: Date, default: null },
  },
  { _id: false },
);

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    mentions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      }
    ],
    text: {
      type: String,
    },
    image: {
      type: String,
    },
    video: {
      type: String,
    },
    audio: {
      url: {
        type: String,
      },
      duration: {
        type: Number,
      },
    },
    poll: { type: pollSchema, default: undefined },
    isPinned: { type: Boolean, default: false },
    pinnedAt: { type: Date, default: null },
    pinnedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    deliveredAt: {
      type: Date,
      default: null,
    },
    readAt: {
      type: Date,
      default: null,
    },
    reactions: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        emoji: {
          type: String,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
      editedAt: {
        type: Date,
        default: null,
      },
      deletedAt: {
        type: Date,
        default: null,
      },
      deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
  },
  { timestamps: true },
);

messageSchema.pre("validate", function validateConversation() {
  const hasPrivateConversation = Boolean(this.receiverId);
  const hasGroupConversation = Boolean(this.groupId);
  if (hasPrivateConversation === hasGroupConversation) {
    this.invalidate("receiverId", "A message must belong to exactly one conversation");
  }
  const hasPoll = Boolean(this.poll?.question && this.poll.options?.length);
  if (hasPoll && (this.text || this.image || this.video || this.audio?.url)) {
    this.invalidate("poll", "Poll messages cannot contain other message content");
  }
});

const Message = mongoose.model("Message", messageSchema);

export default Message;
