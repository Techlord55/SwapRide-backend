/**
 * API Response Class
 * Standardized API response format
 */

class ApiResponse {
  constructor(statusCode, message, data = null) {
    this.statusCode = statusCode;
    this.status = 'success';
    this.message = message;
    if (data !== null) {
      this.data = data;
    }
  }
}

module.exports = ApiResponse;
