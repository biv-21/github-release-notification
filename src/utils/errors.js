class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 409;
    this.name = "ConflictError";
  }
}

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 400;
    this.name = "ValidationError";
  }
}

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 404;
    this.name = "NotFoundError";
  }
}

module.exports = { ConflictError, ValidationError, NotFoundError };
