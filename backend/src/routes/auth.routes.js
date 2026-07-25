const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const auth = require("../middleware/auth.middleware");
const controller = require("../controllers/auth.controller");

// Credential brute-forcing is the only thing on this router worth throttling
// tightly — profile/logout/etc. use the general API limiter from server.js.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { message: "Too many login/register attempts. Please try again in a few minutes." },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post("/register", authLimiter, controller.register);
router.post("/login", authLimiter, controller.login);
router.get("/profile", auth, controller.profile);
router.put("/profile", auth, controller.updateProfile);
router.put("/change-password", auth, controller.changePassword);
router.post("/logout", auth, controller.logout);

module.exports = router;
