import { ApiError, unavailable } from "./errors.js";

export function authentication(platform) {
  async function identity(req, res, next) {
    const match = /^Bearer ([^\s]{1,8192})$/.exec(req.headers.authorization || "");
    if (!match) throw new ApiError(401, "AUTH_REQUIRED", "Sign in to continue.");
    if (!platform?.auth || !platform?.store) throw unavailable();
    try { req.identity = await platform.auth.verifyIdToken(match[1], true); }
    catch (error) {
      if (["auth/internal-error", "app/network-error"].includes(error.code)) throw unavailable();
      throw new ApiError(401, "AUTH_INVALID", "Your session is invalid or expired. Sign in again.");
    }
    if (!req.identity?.uid) throw new ApiError(401, "AUTH_INVALID", "Sign in again.");
    next();
  }
  async function profile(req, res, next) {
    req.user = await platform.store.user(req.identity.uid);
    if (!req.user) throw new ApiError(403, "PROFILE_REQUIRED", "Refresh your account profile before continuing.");
    if (!req.user.isActive) throw new ApiError(403, "ACCOUNT_DISABLED", "This account has been deactivated.");
    if (!["USER", "ADMIN"].includes(req.user.role)) throw new ApiError(403, "FORBIDDEN", "Access is not permitted.");
    next();
  }
  const requireRole = role => (req, res, next) => {
    if (req.user?.role !== role) throw new ApiError(403, "FORBIDDEN", "You do not have permission to access this resource.");
    next();
  };
  return { identity, requireAuth: [identity, profile], requireAdmin: [identity, profile, requireRole("ADMIN")] };
}
