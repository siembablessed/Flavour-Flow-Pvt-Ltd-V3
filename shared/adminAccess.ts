import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

export type AdminPermission =
  | "admin.access"
  | "dashboard.read"
  | "catalog.read"
  | "catalog.write"
  | "inventory.read"
  | "inventory.write"
  | "payments.read"
  | "orders.read"
  | "orders.write";

export type AdminRole =
  | "super_admin"
  | "operations_manager"
  | "inventory_manager"
  | "catalog_manager"
  | "finance_manager"
  | "order_manager"
  | "support_viewer";

export type AdminSection = "overview" | "catalogue" | "inventory" | "payments";

export interface AdminAccessConfig {
  supabaseUrl: string;
  serviceRoleKey: string;
  adminEmails: string[];
  authorizationHeader?: string | string[];
}

export interface AdminAccessProfile {
  id: string;
  email: string | null;
  role: AdminRole | string;
  permissions: AdminPermission[];
  isFallback: boolean;
}

export interface AdminContext {
  admin: SupabaseClient;
  user: User;
  access: AdminAccessProfile;
}

type AdminDirectoryRow = {
  id: string;
  email: string;
  role: string;
  permissions: string[] | null;
  is_active: boolean;
};

const ALL_ADMIN_PERMISSIONS: AdminPermission[] = [
  "admin.access",
  "dashboard.read",
  "catalog.read",
  "catalog.write",
  "inventory.read",
  "inventory.write",
  "payments.read",
  "orders.read",
  "orders.write",
];

const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  super_admin: ALL_ADMIN_PERMISSIONS,
  operations_manager: ALL_ADMIN_PERMISSIONS,
  inventory_manager: ["admin.access", "dashboard.read", "catalog.read", "inventory.read", "inventory.write"],
  catalog_manager: ["admin.access", "dashboard.read", "catalog.read", "catalog.write", "inventory.read"],
  finance_manager: ["admin.access", "dashboard.read", "payments.read", "orders.read"],
  order_manager: ["admin.access", "dashboard.read", "orders.read", "orders.write", "payments.read"],
  support_viewer: ["admin.access", "dashboard.read", "catalog.read", "inventory.read", "orders.read"],
};

function isAdminPermission(value: string): value is AdminPermission {
  return ALL_ADMIN_PERMISSIONS.includes(value as AdminPermission);
}

export function parseBearerToken(header?: string | string[]): string | null {
  const value = Array.isArray(header) ? header[0] : header;
  if (!value) return null;

  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? null;
}

export function normalizeAdminEmails(adminEmails: string[]): string[] {
  return adminEmails.map((email) => email.trim().toLowerCase()).filter(Boolean);
}

export function createAdminClient(config: Pick<AdminAccessConfig, "supabaseUrl" | "serviceRoleKey">) {
  return createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function normalizePermissions(role: string, permissions?: string[] | null): AdminPermission[] {
  const roleDefaults = ROLE_PERMISSIONS[role as AdminRole] ?? [];
  const custom = (permissions ?? []).filter(isAdminPermission);
  return Array.from(new Set([...roleDefaults, ...custom]));
}

function buildFallbackAccess(user: User): AdminAccessProfile {
  return {
    id: user.id,
    email: user.email ?? null,
    role: "super_admin",
    permissions: ALL_ADMIN_PERMISSIONS,
    isFallback: true,
  };
}

export class AdminAuthorizationError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function resolveAdminContext(config: AdminAccessConfig): Promise<AdminContext> {
  const token = parseBearerToken(config.authorizationHeader);
  if (!token) {
    throw new AdminAuthorizationError(401, "Sign in to access the admin workspace.");
  }

  const admin = createAdminClient(config);
  const { data, error } = await admin.auth.getUser(token);

  if (error || !data.user) {
    throw new AdminAuthorizationError(401, "Your session could not be verified.");
  }

  const user = data.user;
  const userEmail = user.email?.trim().toLowerCase() ?? "";
  const fallbackEmails = normalizeAdminEmails(config.adminEmails);

  const { data: directoryRow, error: directoryError } = await admin
    .from("admin_users")
    .select("id, email, role, permissions, is_active")
    .eq("email", userEmail)
    .maybeSingle<AdminDirectoryRow>();

  const directoryMissing =
    directoryError &&
    typeof directoryError === "object" &&
    "code" in directoryError &&
    (directoryError.code === "42P01" || directoryError.code === "PGRST205");

  if (directoryError && !directoryMissing) {
    throw new Error("Unable to load admin access policy.");
  }

  if (directoryRow) {
    if (!directoryRow.is_active) {
      throw new AdminAuthorizationError(403, "Your admin access is currently disabled.");
    }

    const permissions = normalizePermissions(directoryRow.role, directoryRow.permissions);
    if (!permissions.includes("admin.access")) {
      throw new AdminAuthorizationError(403, "Your account is missing base admin access.");
    }

    return {
      admin,
      user,
      access: {
        id: directoryRow.id || user.id,
        email: directoryRow.email ?? user.email ?? null,
        role: directoryRow.role || "support_viewer",
        permissions,
        isFallback: false,
      },
    };
  }

  if (fallbackEmails.includes(userEmail)) {
    return {
      admin,
      user,
      access: buildFallbackAccess(user),
    };
  }

  if (directoryMissing) {
    throw new AdminAuthorizationError(403, "Admin access is not configured yet. Apply the admin_users migration or set ADMIN_EMAILS.");
  }

  throw new AdminAuthorizationError(403, "Your account does not have admin access.");
}

export function hasAdminPermission(access: Pick<AdminAccessProfile, "permissions"> | null | undefined, permission: AdminPermission) {
  return Boolean(access?.permissions.includes(permission));
}

export function assertAdminPermission(access: Pick<AdminAccessProfile, "permissions">, permission: AdminPermission, message: string) {
  if (!hasAdminPermission(access, permission)) {
    throw new AdminAuthorizationError(403, message);
  }
}

export function getAccessibleAdminSections(access: Pick<AdminAccessProfile, "permissions">): AdminSection[] {
  const sections: AdminSection[] = [];

  if (hasAdminPermission(access, "dashboard.read")) {
    sections.push("overview");
  }
  if (hasAdminPermission(access, "catalog.read")) {
    sections.push("catalogue");
  }
  if (hasAdminPermission(access, "inventory.read")) {
    sections.push("inventory");
  }
  if (hasAdminPermission(access, "payments.read")) {
    sections.push("payments");
  }

  return sections;
}

export function getDefaultAdminSection(access: Pick<AdminAccessProfile, "permissions">): AdminSection | null {
  return getAccessibleAdminSections(access)[0] ?? null;
}
