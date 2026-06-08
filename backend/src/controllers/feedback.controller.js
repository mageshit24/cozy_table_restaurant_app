/**
 * feedback.controller.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles customer feedback submission and admin review.
 *
 * Fixes applied:
 *  • Removed unused { Op } import that caused "import issues" test failures
 *  • Added complete input validation (rating range, comment min-length)
 *  • getFeedback supports ?sort=asc|desc AND ?rating=N filtering
 *  • Proper try/catch on both handlers with descriptive error messages
 */

const { Feedback, User } = require("../models"); // Only import what is used

/* ── POST /api/feedback ─────────────────────────────────────────────────────
 *  Authenticated customers submit a star rating + comment.
 */
exports.addFeedback = async (req, res) => {
  try {
    const { rating, comment } = req.body;

    /* Validate rating */
    const parsedRating = Number(rating);
    if (!parsedRating || parsedRating < 1 || parsedRating > 5)
      return res.status(400).json({ message: "Rating must be between 1 and 5" });

    /* Validate comment */
    if (!comment || comment.trim().length === 0)
      return res.status(400).json({ message: "Comment is required" });

    if (comment.trim().length < 5)
      return res.status(400).json({ message: "Comment must be at least 5 characters" });

    const feedback = await Feedback.create({
      rating : parsedRating,
      comment: comment.trim(),
      UserId : req.user.id
    });

    return res.status(201).json({ message: "Feedback submitted successfully", feedback });
  } catch (err) {
    console.error("[feedback] addFeedback error:", err.message);
    return res.status(500).json({ message: "Error submitting feedback", error: err.message });
  }
};

/* ── GET /api/feedback ──────────────────────────────────────────────────────
 *  Admin-only. Returns all feedback with user info.
 *  Query params:
 *    sort   – "asc" | "desc"  (default: desc)
 *    rating – 1-5             (optional filter)
 */
exports.getFeedback = async (req, res) => {
  try {
    const { sort = "desc", rating } = req.query;

    /* Build optional where clause */
    const where = {};
    if (rating) {
      const r = Number(rating);
      if (r >= 1 && r <= 5) where.rating = r;
    }

    const allFeedback = await Feedback.findAll({
      where,
      include: [{ model: User, attributes: ["name", "email"] }],
      order  : [["createdAt", sort === "asc" ? "ASC" : "DESC"]]
    });

    return res.json(allFeedback);
  } catch (err) {
    console.error("[feedback] getFeedback error:", err.message);
    return res.status(500).json({ message: "Error fetching feedback", error: err.message });
  }
};
