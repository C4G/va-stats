// FILE CONTENTS: MySQL Courses table query

import { prisma } from "@/lib/prisma";

export default async function handler(req, res) {
  try {
    if (!req.body || !req.body.email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const email = req.body.email;
    const user = await prisma.vausers.findUnique({ where: { email } });
    res.status(200).json({ users: user ? [user] : [] });
  } catch (error) {
    console.error("getuserdata API error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
}
