import type { SupabaseClient } from "@supabase/supabase-js";

export interface AdminAuditEntry {
  actorId: string;
  actorEmail: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  details?: Record<string, unknown> | null;
}

export async function writeAdminAuditLog(admin: SupabaseClient, entry: AdminAuditEntry) {
  const { error } = await admin.from("admin_audit_log").insert({
    actor_id: entry.actorId,
    actor_email: entry.actorEmail,
    action: entry.action,
    resource_type: entry.resourceType,
    resource_id: entry.resourceId ?? null,
    details: entry.details ?? null,
  });

  if (error) {
    const relationMissing =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error.code === "42P01" || error.code === "PGRST205");

    if (!relationMissing) {
      console.warn("[admin-audit] failed to record audit log:", error.message);
    }
  }
}
