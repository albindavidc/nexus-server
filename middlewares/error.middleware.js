const errorMiddleware = (err, req, res, next) => {
  console.error(`${err.name} - ${err.message}`);

  if (err.status) {
    return res.status(err.status).json({
      success: false,
      message: err.message,
    });
  }

  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  if (err.code === 11000) {
    const field = err.keyValue ? Object.keys(err.keyValue)[0] : "Field";
    const formattedField = field.charAt(0).toUpperCase() + field.slice(1);
    return res.status(400).json({
      success: false,
      message: `${formattedField} already exists`,
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
};

module.exports = errorMiddleware;
