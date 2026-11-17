const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware.js");
const Message = require("../models/Message.js");

/**
 * @route   GET /api/chat
 * @desc    Get all chat messages for authenticated user's team
 * @access  Private
 */
router.get("/", protect, async (req, res) => {
  try {
    if (!req.user.teamId) {
      return res.status(400).json({ message: "You are not assigned to a team" });
    }

    const messages = await Message.find({ team: req.user.teamId })
      .sort({ createdAt: 1 })
      .limit(200);

    res.status(200).json(messages);
  } catch (error) {
    console.error("GET /api/chat error:", error);
    res.status(500).json({ message: "Server error fetching messages" });
  }
});

/**
 * @route   POST /api/chat
 * @desc    Post a new chat message for authenticated user's team
 * @access  Private
 */
router.post("/", protect, async (req, res) => {
  try {
    if (!req.user.teamId) {
      return res.status(400).json({ message: "You are not assigned to a team" });
    }

    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Message text cannot be empty" });
    }

    const message = new Message({
      team: req.user.teamId,
      sender: req.user._id,
      senderName: req.user.name || "Teammate",
      text: text.trim(),
    });

    const savedMessage = await message.save();

    // Real-time broadcast via Socket.IO to the team's room
    if (req.io) {
      req.io.to(req.user.teamId.toString()).emit("newMessage", savedMessage);
    }

    res.status(201).json(savedMessage);
  } catch (error) {
    console.error("POST /api/chat error:", error);
    res.status(500).json({ message: "Server error saving message" });
  }
});

module.exports = router;
