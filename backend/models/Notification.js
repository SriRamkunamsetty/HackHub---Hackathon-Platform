const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: String,
      required: true,
      index: true,
    },
    sender: {
      name: { type: String, default: "HackHub System" },
      email: { type: String, default: "system@hackhub.dev" },
      avatar: { type: String, default: "" },
    },
    type: {
      type: String,
      enum: [
        "task_assigned",
        "task_updated",
        "team_invite",
        "team_join_request",
        "mentor_feedback",
        "hackathon_alert",
        "role_change",
        "announcement",
      ],
      default: "announcement",
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    link: {
      type: String,
      default: "/dashboard",
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    metadata: {
      teamId: String,
      taskId: String,
      hackathonId: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Notification", notificationSchema);
