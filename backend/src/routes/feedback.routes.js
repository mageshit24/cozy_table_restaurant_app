/**
 * feedback.routes.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Fixes applied:
 *  • Removed stale import that was causing controller resolution failures
 *  • All routes now properly wired to feedback.controller exports
 *  • POST protected by auth middleware; GET restricted to admin role
 */

const router     = require("express").Router();
const auth       = require("../middleware/auth.middleware");
const role       = require("../middleware/role.middleware");
const controller = require("../controllers/feedback.controller");

/* Customer: submit new feedback */
router.post("/", auth, controller.addFeedback);

/* Admin: view all feedback (supports ?sort=asc|desc&rating=N) */
router.get("/", auth, role("admin"), controller.getFeedback);

module.exports = router;
