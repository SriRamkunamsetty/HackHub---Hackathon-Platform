const express = require("express");
const router = express.Router();
const Mentor = require("../models/Mentor.js");
const MentorshipRequest = require("../models/MentorshipRequest.js");

// Initial mock dataset for demo & out-of-the-box reliability
const DEFAULT_MENTORS = [
  {
    _id: "mentor-1",
    name: "Dr. Alistair Vance",
    title: "Principal Research Scientist",
    company: "Google DeepMind",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
    domains: ["AI / ML", "Healthcare", "Cloud & DevOps"],
    skills: ["PyTorch", "LLM Fine-tuning", "Autonomous Agents", "Distributed Training"],
    bio: "12+ years pioneering transformer architectures and biomedical computer vision models. Passionate about empowering student builders.",
    experienceYears: 12,
    availabilityStatus: "available",
    contactEmail: "alistair.vance@deepmind.example",
    githubUrl: "https://github.com/alistair-vance",
    linkedinUrl: "https://linkedin.com/in/alistair-vance",
  },
  {
    _id: "mentor-2",
    name: "Elena Rostova",
    title: "Lead Cryptography & Protocol Engineer",
    company: "Ethereum Foundation",
    avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80",
    domains: ["Web3 & Blockchain", "Cybersecurity"],
    skills: ["Solidity", "Zero-Knowledge Proofs", "Rust", "Smart Contract Security"],
    bio: "Core contributor to zk-Rollup scaling solutions and EVM security audits. Helping teams build safe decentralized systems.",
    experienceYears: 8,
    availabilityStatus: "available",
    contactEmail: "elena.rostova@protocol.example",
    githubUrl: "https://github.com/elena-rostova",
    linkedinUrl: "https://linkedin.com/in/elena-rostova",
  },
  {
    _id: "mentor-3",
    name: "Marcus Thorne",
    title: "Staff Cloud Platform Architect",
    company: "AWS / Open Infrastructure",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80",
    domains: ["Cloud & DevOps", "Open Innovation", "FinTech"],
    skills: ["Kubernetes", "Terraform", "Serverless", "System Observability"],
    bio: "Designs resilient multi-region architectures handling 100k+ RPS. Specializes in optimizing build latency and developer velocity.",
    experienceYears: 10,
    availabilityStatus: "available",
    contactEmail: "marcus.thorne@cloud.example",
    githubUrl: "https://github.com/marcus-thorne",
    linkedinUrl: "https://linkedin.com/in/marcus-thorne",
  },
  {
    _id: "mentor-4",
    name: "Sophia Chen",
    title: "VP of Product Engineering",
    company: "Stripe",
    avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80",
    domains: ["FinTech", "Mobile Apps", "Web Development"],
    skills: ["React", "TypeScript", "Payment APIs", "Microfrontends"],
    bio: "Built global billing primitives and merchant checkout platforms. Loves reviewing user onboarding flows and API ergonomics.",
    experienceYears: 9,
    availabilityStatus: "busy",
    contactEmail: "sophia.chen@fintech.example",
    githubUrl: "https://github.com/sophia-chen",
    linkedinUrl: "https://linkedin.com/in/sophia-chen",
  },
];

const DEFAULT_REQUESTS = [
  {
    _id: "req-1",
    teamName: "NeuralWeavers",
    projectName: "BioPulse AI Diagnostics",
    mentorId: "mentor-1",
    mentorName: "Dr. Alistair Vance",
    domain: "Healthcare",
    status: "accepted",
    requestMessage: "We need architectural guidance on edge inference quantisation (INT8) and zero-shot hallucination guardrails.",
    projectRepoUrl: "https://github.com/NeuralWeavers/biopulse",
    projectDemoUrl: "https://biopulse-demo.vercel.app",
    feedbackHistory: [
      {
        _id: "fb-1",
        milestone: "System Architecture Review",
        feedback: "Solid foundation. Recommend switching the clinical reasoning prompt chain to use structured JSON schema enforcement before evaluating confidence scores.",
        rating: 5,
        givenBy: "Dr. Alistair Vance",
        createdAt: new Date(Date.now() - 3600000 * 24),
      },
      {
        _id: "fb-2",
        milestone: "MVP Demo & Code Quality",
        feedback: "Latency benchmark improved from 1.4s to 320ms. Ensure proper error boundary handling if WebSocket drops.",
        rating: 4,
        givenBy: "Dr. Alistair Vance",
        createdAt: new Date(Date.now() - 3600000 * 4),
      },
    ],
  },
  {
    _id: "req-2",
    teamName: "QuantumBlock",
    projectName: "AetherZero ZK-Rollup",
    mentorId: "mentor-2",
    mentorName: "Elena Rostova",
    domain: "Web3 & Blockchain",
    status: "pending",
    requestMessage: "Looking for a mentor to review our Groth16 circuit constraints and verify gas optimization benchmarks.",
    projectRepoUrl: "https://github.com/QuantumBlock/aether-zk",
    projectDemoUrl: "https://aetherzero.network",
    feedbackHistory: [],
  },
];

// Helper to filter mentors
function filterMentors(mentors, { domain, search, availability }) {
  return mentors.filter((m) => {
    const matchDomain =
      !domain ||
      domain === "All" ||
      m.domains.some((d) => d.toLowerCase() === domain.toLowerCase());

    const matchAvail =
      !availability ||
      availability === "all" ||
      m.availabilityStatus.toLowerCase() === availability.toLowerCase();

    const q = search ? search.trim().toLowerCase() : "";
    const matchSearch =
      !q ||
      m.name.toLowerCase().includes(q) ||
      m.title.toLowerCase().includes(q) ||
      m.company.toLowerCase().includes(q) ||
      m.skills.some((s) => s.toLowerCase().includes(q));

    return matchDomain && matchAvail && matchSearch;
  });
}

// Validation helpers
function validateMentorPayload(body) {
  if (!body.name || body.name.trim().length < 2) {
    return { valid: false, message: "Valid mentor name is required." };
  }
  if (!body.title || body.title.trim().length < 2) {
    return { valid: false, message: "Professional title is required." };
  }
  if (!body.contactEmail || !body.contactEmail.includes("@")) {
    return { valid: false, message: "Valid contact email is required." };
  }
  if (!body.domains || !Array.isArray(body.domains) || body.domains.length === 0) {
    return { valid: false, message: "At least one expertise domain is required." };
  }
  return { valid: true };
}

function validateFeedbackPayload(body) {
  if (!body.feedback || body.feedback.trim().length < 10) {
    return { valid: false, message: "Feedback must be at least 10 characters of actionable guidance." };
  }
  if (!body.milestone) {
    return { valid: false, message: "Feedback milestone stage is required." };
  }
  return { valid: true };
}

// GET /api/mentors - list mentors
router.get("/", async (req, res) => {
  try {
    const { domain, search, availability } = req.query;

    let mentors = [];
    try {
      mentors = await Mentor.find({}).lean();
      if (!mentors || mentors.length === 0) {
        await Mentor.insertMany(DEFAULT_MENTORS);
        mentors = await Mentor.find({}).lean();
      }
    } catch (dbErr) {
      console.warn("MongoDB offline, using fallback mentors:", dbErr.message);
      mentors = DEFAULT_MENTORS;
    }

    const filtered = filterMentors(mentors, { domain, search, availability });

    return res.status(200).json({
      success: true,
      count: filtered.length,
      mentors: filtered,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve mentors.",
      error: err.message,
    });
  }
});

// POST /api/mentors - register new mentor profile
router.post("/", async (req, res) => {
  try {
    const validation = validateMentorPayload(req.body);
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    const payload = {
      name: req.body.name.trim(),
      title: req.body.title.trim(),
      company: req.body.company ? req.body.company.trim() : "Independent Advisor",
      avatarUrl: req.body.avatarUrl || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80",
      domains: req.body.domains,
      skills: Array.isArray(req.body.skills) ? req.body.skills : [],
      bio: req.body.bio ? req.body.bio.trim() : "",
      experienceYears: Number(req.body.experienceYears) || 3,
      availabilityStatus: req.body.availabilityStatus || "available",
      contactEmail: req.body.contactEmail.trim(),
      githubUrl: req.body.githubUrl ? req.body.githubUrl.trim() : "",
      linkedinUrl: req.body.linkedinUrl ? req.body.linkedinUrl.trim() : "",
    };

    let created;
    try {
      created = await Mentor.create(payload);
    } catch {
      created = { ...payload, _id: "mentor-local-" + Date.now() };
    }

    return res.status(201).json({
      success: true,
      message: "Mentor profile created successfully.",
      mentor: created,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to create mentor profile.",
      error: err.message,
    });
  }
});

// GET /api/mentors/requests - list requests and feedback history
router.get("/requests", async (req, res) => {
  try {
    const { teamName, mentorId } = req.query;

    let requests = [];
    try {
      const query = {};
      if (teamName) query.teamName = { $regex: new RegExp(`^${teamName.trim()}$`, "i") };
      if (mentorId) query.mentorId = mentorId;
      requests = await MentorshipRequest.find(query).sort({ updatedAt: -1 }).lean();

      if ((!requests || requests.length === 0) && !teamName && !mentorId) {
        await MentorshipRequest.insertMany(DEFAULT_REQUESTS);
        requests = await MentorshipRequest.find({}).lean();
      }
    } catch (dbErr) {
      console.warn("MongoDB offline, using fallback requests:", dbErr.message);
      requests = DEFAULT_REQUESTS;
    }

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch mentorship requests.",
      error: err.message,
    });
  }
});

// POST /api/mentors/requests - submit mentorship request
router.post("/requests", async (req, res) => {
  try {
    const { teamName, projectName, mentorId, mentorName, domain, requestMessage, projectRepoUrl, projectDemoUrl } = req.body;

    if (!teamName || !projectName || !mentorId || !requestMessage) {
      return res.status(400).json({
        success: false,
        message: "Team name, project name, mentor, and request message are required.",
      });
    }

    const payload = {
      teamName: teamName.trim(),
      projectName: projectName.trim(),
      mentorId,
      mentorName: mentorName || "Mentor",
      domain: domain || "AI / ML",
      status: "pending",
      requestMessage: requestMessage.trim(),
      projectRepoUrl: projectRepoUrl ? projectRepoUrl.trim() : "",
      projectDemoUrl: projectDemoUrl ? projectDemoUrl.trim() : "",
      feedbackHistory: [],
    };

    let created;
    try {
      created = await MentorshipRequest.create(payload);
    } catch {
      created = { ...payload, _id: "req-local-" + Date.now(), createdAt: new Date() };
    }

    return res.status(201).json({
      success: true,
      message: "Mentorship request submitted successfully.",
      request: created,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to submit request.",
      error: err.message,
    });
  }
});

// PATCH /api/mentors/requests/:id/status - accept or reject request
router.patch("/requests/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!["pending", "accepted", "rejected", "completed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be pending, accepted, rejected, or completed.",
      });
    }

    const { id } = req.params;
    let updated;
    try {
      updated = await MentorshipRequest.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      );
    } catch {
      updated = { _id: id, status };
    }

    return res.status(200).json({
      success: true,
      message: `Request marked as ${status}.`,
      request: updated,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to update request status.",
      error: err.message,
    });
  }
});

// POST /api/mentors/requests/:id/feedback - append structured feedback
router.post("/requests/:id/feedback", async (req, res) => {
  try {
    const validation = validateFeedbackPayload(req.body);
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    const { id } = req.params;
    const feedbackItem = {
      milestone: req.body.milestone,
      feedback: req.body.feedback.trim(),
      rating: Math.min(5, Math.max(1, Number(req.body.rating) || 5)),
      givenBy: req.body.givenBy || "Mentor",
      createdAt: new Date(),
    };

    let updated;
    try {
      updated = await MentorshipRequest.findByIdAndUpdate(
        id,
        { $push: { feedbackHistory: feedbackItem } },
        { new: true }
      );
    } catch {
      updated = { _id: id, feedbackHistory: [feedbackItem] };
    }

    return res.status(201).json({
      success: true,
      message: "Progress feedback added to team history.",
      feedback: feedbackItem,
      request: updated,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to append feedback.",
      error: err.message,
    });
  }
});

module.exports = router;
module.exports.router = router;
module.exports.DEFAULT_MENTORS = DEFAULT_MENTORS;
module.exports.DEFAULT_REQUESTS = DEFAULT_REQUESTS;
module.exports.filterMentors = filterMentors;
module.exports.validateMentorPayload = validateMentorPayload;
module.exports.validateFeedbackPayload = validateFeedbackPayload;
