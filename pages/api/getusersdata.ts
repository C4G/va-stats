import { prisma } from "@/lib/prisma";
import { normalizeDateValue } from "@/utils/date-normalizers";

export default async function handler(req, res) {
  try {
    const users = await prisma.vausers.findMany({
      orderBy: { name: "asc" },
    });

    const normalized = users.map((user) => ({
      ...user,
      joindate: normalizeDateValue(user.joindate),
      date_of_birth: normalizeDateValue(user.date_of_birth),
      lastlogin: normalizeDateValue(user.lastlogin),
    }));
    res.status(200).json({ users: normalized });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
}
