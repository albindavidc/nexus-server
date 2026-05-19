const jwt = require("jsonwebtoken");

const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_ACCESS_TOKEN, {
    expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || "15m",
  });
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_TOKEN, {
    expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || "7d",
  });
};

const verifyAccessToken = async (token) => {
  return jwt.verify(token, process.env.JWT_ACCESS_TOKEN);
};

const verifyRefreshToken = async (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_TOKEN);
};

const setCookies = (res, accessToken, refreshToken) => {
  const accessMaxAge = 20 * 60 * 1000;
  const refreshMaxAge = 7 * 24 * 60 * 60 * 1000;

  res.cookie("access_token", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: accessMaxAge,
    path: "/",
  });
  
  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: refreshMaxAge,
    path: "/",
  });
};

const clearCookies = (res) => {
  res.clearCookie("access_token", { path: "/" });
  res.clearCookie("refresh_token", { path: "/" });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  setCookies,
  clearCookies,
};
