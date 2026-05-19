const User = require("./auth.model");
const {
  generateAccessToken,
  generateRefreshToken,
  setCookies,
  verifyAccessToken,
  verifyRefreshToken,
  clearCookies,
} = require("../../utils/jwt.util.js");

const AuthService = {
  async registerUser(res, { firstName, lastName, username, email, password }) {
    const existingUser = await User.findOne({
      $or: [{ username: username }, { email: email }],
    });

    if (existingUser) {
      const field = existingUser.email === email ? "email" : "username";
      return res.status(400).json({
        success: false,
        message: `User already exists with this ${field}`,
      });
    }

    const user = await User.create({
      firstName,
      lastName,
      username,
      email,
      password,
    });

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    setCookies(res, accessToken, refreshToken);

    return user;
  },

  async login(res, { email, password }) {
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isPasswordMatched = await user.comparePassword(password);

    if (!isPasswordMatched) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    setCookies(res, accessToken, refreshToken);

    return user;
  },

  async refreshToken(res, req) {
    const refreshToken = req.cookies?.refresh_token;

    if (!refreshToken) {
      return res.status(404).json({
        success: false,
        message: "Refresh token not found",
      });
    }

    let decoded;
    try {
      decoded = await verifyRefreshToken(refreshToken);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    setCookies(res, newAccessToken, newRefreshToken);

    return user;
  },

  async logout(res, userId) {
    await User.findByIdAndUpdate(userId, {
      refreshToken: null,
      status: "inactive",
    });

    clearCookies(res);

    return true;
  },

  async getCurrentUser(userId) {
    return await User.findById(userId);
  },
};

module.exports = AuthService;
