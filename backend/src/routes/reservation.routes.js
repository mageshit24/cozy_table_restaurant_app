/**
 * reservation.routes.js – adds /my and /check endpoints, proper CRUD wiring
 */
const router     = require("express").Router();
const auth       = require("../middleware/auth.middleware");
const controller = require("../controllers/reservation.controller");

router.post("/check", auth, controller.checkAvailability);  // Availability check
router.get("/my",     auth, controller.getMyReservations);  // Customer's own
router.get("/",       auth, controller.getReservations);    // Admin: all with filters
router.post("/",      auth, controller.createReservation);  // Create
router.put("/:id",    auth, controller.updateReservation);  // Update
router.delete("/:id", auth, controller.deleteReservation);  // Cancel

module.exports = router;
