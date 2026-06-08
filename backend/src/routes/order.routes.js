const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const controller = require("../controllers/order.controller");

router.post("/", auth, controller.placeOrder);
router.get("/", auth, controller.getOrders);
router.put("/:id/status", auth, role("admin"), controller.updateStatus);  // Fixed: GET -> PUT, correct path

module.exports = router;
