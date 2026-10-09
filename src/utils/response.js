function sendResponse(res, statusCode, data) {
  res.status(statusCode).json({
    statusCode,
    data,
  });
}

module.exports = { sendResponse };