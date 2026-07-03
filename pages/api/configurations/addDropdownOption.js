import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { upsertDropdownOption } from "@/utils/dropdown-config";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  try {
    const session = await getServerSession(req, res, authOptions);
    const userRole = session?.user?.role;

    const allowedRoles = new Set(["ADMINISTRATOR"]);
    if (!session || !allowedRoles.has(userRole)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { key, value, label, sortOrder } = req.body ?? {};
    await upsertDropdownOption({ key, value, label, sortOrder });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[addDropdownOption] error:", error?.message, error);
    return res.status(500).json({ success: false, message: error?.message ?? "Internal server error" });
  }
}
