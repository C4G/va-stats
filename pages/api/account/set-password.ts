import { auth } from "@/lib/auth";
import { fromNodeHeaders } from "better-auth/node";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  const password = req.body?.password;
  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters." });
  }

  try {
    await auth.api.setPassword({
      body: { newPassword: password },
      headers: fromNodeHeaders(req.headers),
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Unable to set password:", error);
    const status = error?.statusCode === 401 || error?.status === 401 ? 401 : 400;
    return res.status(status).json({ message: error?.message ?? "Unable to set password." });
  }
}
