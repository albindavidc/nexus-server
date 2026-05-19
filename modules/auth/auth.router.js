const express = require("express");
const router = express.Router();
const AuthController = require("./auth.controller");
const { registerValidator, loginValidator } = require("./auth.validator");
const { protect } = require("../../middlewares/jwt.middleware");

router.post("/register", registerValidator, AuthController.register);
router.post("/login", loginValidator, AuthController.login);
router.post("/refresh-token", AuthController.refreshToken);

router.post("/logout", protect, AuthController.logout);
router.get("/user", protect, AuthController.getUser);

module.exports = router;
