export class ApiError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
export const unavailable = () => new ApiError(503, "PLATFORM_UNAVAILABLE", "Account services are unavailable. Please try again later.");
