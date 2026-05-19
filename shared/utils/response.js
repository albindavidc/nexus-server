const sendSuccess = (res, data, message = "Success", statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    data,
    message,
  });
};

const sendError = (res, message = "Error", statusCode = 500) => {
  res.status(statusCode).json({
    success: false,
    data: null,
    message,
  });
};

module.exports = { sendSuccess, sendError };
