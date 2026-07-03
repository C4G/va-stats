import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { getRulesForCourse, mergeBatchStatusDerivedRules } from "@/utils/batch-status-derived";
import { getBatchStatusDerivedRules, saveBatchStatusDerivedRules } from "@/utils/batch-status-rules-config";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const session = await getServerSession(req, res, authOptions);
      if (!session?.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const rawRules = await getBatchStatusDerivedRules();
      const courseName = req.query?.course;
      const globalMerged = mergeBatchStatusDerivedRules(rawRules?.defaultRules ?? rawRules);
      const rules = courseName ? getRulesForCourse(rawRules, courseName) : globalMerged;
      return res.status(200).json({
        rules,
        byCourse: rawRules?.byCourse ?? {},
        defaultRules: globalMerged,
      });
    }

    if (req.method === "POST") {
      const session = await getServerSession(req, res, authOptions);
      const userRole = session?.user?.role;
      const allowedRoles = new Set(["ADMINISTRATOR"]);
      if (!session || !allowedRoles.has(userRole)) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const saved = await saveBatchStatusDerivedRules(req.body ?? {});
      return res.status(200).json({
        success: true,
        rules: saved.rules,
        byCourse: saved.byCourse ?? {},
        defaultRules: saved.defaultRules ?? mergeBatchStatusDerivedRules(null),
      });
    }

    return res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    console.error("[batchStatusRules] error:", error?.message, error);
    return res.status(400).json({ message: error?.message ?? "Request failed" });
  }
}
