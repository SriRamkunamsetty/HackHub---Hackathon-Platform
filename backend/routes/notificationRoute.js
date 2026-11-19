const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");

// GET /api/notifications - fetch notifications for user
router.get("/", async (req, res) => {
  try {
    const { user, unreadOnly, limit = 50 } = req.query;
    const query = {};

    if (user) {
      query.recipient = { $in: [user, "all", "students"] };
    }

    if (unreadOnly === "true") {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10));

    const unreadCount = await Notification.countDocuments({
      ...query,
      isRead: false,
    });

    res.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Server error fetching notifications" });
  }
});

// POST /api/notifications - create a notification
router.post("/", async (req, res) => {
  try {
    const { recipient, sender, type, title, message, link, metadata } = req.body;

    if (!recipient || !title || !message) {
      return res.status(400).json({ message: "Recipient, title, and message are required" });
    }

    const notification = new Notification({
      recipient,
      sender,
      type,
      title,
      message,
      link,
      metadata,
    });

    await notification.save();
    res.status(201).json(notification);
  } catch (error) {
    console.error("Error creating notification:", error);
    res.status(500).json({ message: "Server error creating notification" });
  }
});

// PUT /api/notifications/:id/read - mark single notification as read
router.put("/:id/read", async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json(notification);
  } catch (error) {
    console.error("Error updating notification:", error);
    res.status(500).json({ message: "Server error updating notification" });
  }
});

// PUT /api/notifications/read-all - mark all notifications as read for a recipient
router.put("/read-all", async (req, res) => {
  try {
    const { user } = req.body;
    const query = user ? { recipient: { $in: [user, "all", "students"] } } : {};

    await Notification.updateMany(query, { isRead: true });
    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({ message: "Server error updating notifications" });
  }
});

// DELETE /api/notifications/:id - delete notification
router.delete("/:id", async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    res.json({ message: "Notification deleted" });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({ message: "Server error deleting notification" });
  }
});

module.exports = router;
