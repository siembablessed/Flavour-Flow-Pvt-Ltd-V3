import type { ApiRequest, ApiResponse } from "../../_lib/httpTypes.js";
import { getEnv } from "../../_lib/env.js";
import { AdminInventorySnapshotError, loadAdminInventorySnapshot } from "../../../shared/adminInventorySnapshot.js";

function parseAdminEmails(value?: string): string[] {
  return value?.split(",").map((email) => email.trim()).filter(Boolean) ?? [];
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const env = getEnv();
    const snapshot = await loadAdminInventorySnapshot({
      supabaseUrl: env.SUPABASE_URL,
      serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
      adminEmails: parseAdminEmails(env.ADMIN_EMAILS),
      authorizationHeader: req.headers.authorization,
    });

    res.status(200).json({ snapshot });
  } catch (error) {
    if (error instanceof AdminInventorySnapshotError) {
      res.status(error.status).json({ error: error.message });
      return;
    }

    const message = error instanceof Error ? error.message : "Unable to load inventory snapshot";
    res.status(500).json({ error: message });
  }
}

