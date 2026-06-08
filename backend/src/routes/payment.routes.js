const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const controller = require("../controllers/payment.controller");

router.post("/", auth, controller.processPayment);

module.exports = router;
