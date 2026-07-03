import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { deleteDropdownOption } from "@/utils/dropdown-config";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  try {
    const session = await getServerSession(req, res, authOptions);
    const userRole = session?.user?.role;

    const allowedRoles = new Set(["ADMINISTRATOR"]);
    if (!session || !allowedRoles.has(userRole)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { key, value } = req.body ?? {};
    const result = await deleteDropdownOption({ key, value });

    if (!result?.deleted) {
      return res.status(400).json({ message: result?.reason ?? "Deletion failed" });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[deleteDropdownOption] error:", error?.message, error);
    return res.status(500).json({ success: false, message: error?.message ?? "Internal server error" });
  }
}
