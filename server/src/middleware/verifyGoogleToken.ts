import { OAuth2Client } from "google-auth-library";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Only initialise the Google OAuth2 client when the env var is configured.
// If GOOGLE_CLIENT_ID is absent the client stays null and calls to
// verifyGoogleIdToken() will throw a descriptive error rather than crashing
// the server on startup.
const googleClient = process.env.GOOGLE_CLIENT_ID
  ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
  : null;

export interface AuthenticatedRequest extends Request {
  /** Mongo _id string of the authenticated user */
  userId?: string;
}

/**
 * Middleware: verifies the Bearer token in the Authorization header as our
 * own session JWT.  Attaches req.userId = Mongo _id string on success.
 *
 * Note: the Google ID token fallback that existed in an earlier version has
 * been removed.  All authenticated routes now require the application JWT
 * obtained from POST /auth/login, POST /auth/register, or POST /auth/google.
 */
export async function verifyToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res
      .status(401)
      .json({ error: "Missing or malformed Authorization header" });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      sub: string;
    };
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Verify a Google ID token — used exclusively in POST /auth/google.
 * Throws if Google OAuth is not configured or the token is invalid.
 */
export async function verifyGoogleIdToken(idToken: string): Promise<{
  sub: string;
  email: string;
  name: string;
  picture: string;
}> {
  if (!googleClient) {
    throw new Error(
      "Google authentication is not configured on this server. " +
        "Set GOOGLE_CLIENT_ID in your environment to enable it.",
    );
  }
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID!,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) {
    throw new Error("Invalid Google ID token");
  }
  return {
    sub: payload.sub,
    email: payload.email,
    name: payload.name ?? "",
    picture: payload.picture ?? "",
  };
}

/**
 * Issue a 15-day session JWT.
 * @param mongoId  The Mongo _id string of the authenticated user.
 */
export function issueSessionJWT(mongoId: string): string {
  return jwt.sign({ sub: mongoId }, process.env.JWT_SECRET!, {
    expiresIn: "15d",
  });
}
