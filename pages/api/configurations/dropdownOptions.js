import { getDropdownOptions } from "@/utils/dropdown-config";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });

  try {
    const { key } = req.query;
    if (!key) return res.status(400).json({ message: "Missing query param: key" });

    const options = await getDropdownOptions({ key });
    return res.status(200).json({ options });
  } catch (error) {
    console.error("[dropdownOptions] error:", error?.message, error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
