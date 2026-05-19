const User = require("../modules/auth/auth.model");
const { verifyAccessToken } = require("../utils/jwt.util");

const protect = async (req, res, next) => {
  try {
    const token = req.cookies.access_token;
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access Denied. No token provided",
      });
    }

    let decodedToken;
    try {
      decodedToken = await verifyAccessToken(token);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid Token",
      });
    }

    const user = await User.findById(decodedToken.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User Not Found",
      });
    }
    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { protect };
