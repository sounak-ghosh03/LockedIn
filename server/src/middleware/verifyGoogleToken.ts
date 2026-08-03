import { OAuth2Client } from "google-auth-library";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export interface AuthenticatedRequest extends Request {
  userId?: string; // Google sub (googleId)
}

/**
 * Middleware: accepts either a Google ID token (for /auth/google)
 * or our own session JWT (for all other routes).
 *
 * Checks:
 *  - Google token: aud, iss, exp via google-auth-library
 *  - Session JWT: signature + exp via jsonwebtoken
 *
 * Attaches req.userId = googleId on success.
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

  // Try verifying as our own session JWT first (most common case)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      sub: string;
    };
    req.userId = payload.sub;
    next();
    return;
  } catch {
    // Not our JWT — fall through to try Google ID token
  }

  // Try verifying as a Google ID token (used for the first /auth/google call)
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID!,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub) {
      res.status(401).json({ error: "Invalid Google ID token payload" });
      return;
    }
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Verify Google ID token specifically — used in the /auth/google route
 * to bootstrap the session (before the app has our JWT).
 */
export async function verifyGoogleIdToken(idToken: string): Promise<{
  sub: string;
  email: string;
  name: string;
  picture: string;
}> {
  const ticket = await client.verifyIdToken({
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

/** Issue a short-lived session JWT (7 days) */
export function issueSessionJWT(googleId: string): string {
  return jwt.sign({ sub: googleId }, process.env.JWT_SECRET!, {
    expiresIn: "7d",
  });
}
