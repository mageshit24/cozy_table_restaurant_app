const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const controller = require("../controllers/auth.controller");

router.post("/register", controller.register);
router.post("/login", controller.login);
router.get("/profile", auth, controller.profile);
router.put("/profile", auth, controller.updateProfile);
router.put("/change-password", auth, controller.changePassword);
router.post("/logout", auth, controller.logout);

module.exports = router;
