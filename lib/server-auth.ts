import type { IncomingMessage } from "node:http";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "./auth";

export async function getServerSession(req: IncomingMessage) {
  try {
    return await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
  } catch (error) {
    console.error("Better Auth session lookup failed:", error);
    return null;
  }
}
