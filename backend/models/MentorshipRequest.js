const mongoose = require("mongoose");

const feedbackItemSchema = new mongoose.Schema({
  milestone: {
    type: String,
    required: true,
    enum: [
      "Initial Project Ideation",
      "System Architecture Review",
      "MVP Demo & Code Quality",
      "Final Pitch & Deployment Review",
    ],
    default: "MVP Demo & Code Quality",
  },
  feedback: {
    type: String,
    required: [true, "Feedback content is required"],
    trim: true,
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: 5,
  },
  givenBy: {
    type: String,
    required: true,
    default: "Assigned Mentor",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const mentorshipRequestSchema = new mongoose.Schema(
  {
    teamName: {
      type: String,
      required: [true, "Team name is required"],
      trim: true,
    },
    projectName: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
    },
    mentorId: {
      type: String,
      required: [true, "Mentor ID or name is required"],
    },
    mentorName: {
      type: String,
      required: true,
    },
    domain: {
      type: String,
      required: true,
      default: "AI / ML",
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "completed"],
      default: "pending",
    },
    requestMessage: {
      type: String,
      required: [true, "Request description is required"],
      trim: true,
    },
    projectRepoUrl: {
      type: String,
      default: "",
    },
    projectDemoUrl: {
      type: String,
      default: "",
    },
    feedbackHistory: [feedbackItemSchema],
  },
  {
    timestamps: true,
  }
);

const MentorshipRequest =
  mongoose.models.MentorshipRequest ||
  mongoose.model("MentorshipRequest", mentorshipRequestSchema);

module.exports = MentorshipRequest;
