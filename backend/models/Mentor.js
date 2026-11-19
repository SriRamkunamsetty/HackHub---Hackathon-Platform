const mongoose = require("mongoose");

const mentorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Mentor name is required"],
      trim: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    company: {
      type: String,
      default: "Independent Technical Advisor",
      trim: true,
    },
    avatarUrl: {
      type: String,
      default: "",
    },
    domains: {
      type: [String],
      required: true,
      default: ["Open Innovation"],
    },
    skills: {
      type: [String],
      default: [],
    },
    bio: {
      type: String,
      default: "",
      trim: true,
    },
    experienceYears: {
      type: Number,
      min: 1,
      default: 3,
    },
    availabilityStatus: {
      type: String,
      enum: ["available", "busy", "unavailable"],
      default: "available",
    },
    contactEmail: {
      type: String,
      required: [true, "Contact email is required"],
      trim: true,
    },
    githubUrl: {
      type: String,
      default: "",
    },
    linkedinUrl: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

const Mentor = mongoose.models.Mentor || mongoose.model("Mentor", mentorSchema);

module.exports = Mentor;
