import { createClient, type User } from "@supabase/supabase-js";

export interface AdminProductRow {
  id: string;
  productId: string;
  name: string;
  category: string;
  categoryId: string;
  pack: string;
  code: string;
  casePrice: number;
  unitPrice: number;
  unitPriceVat: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProductInput {
  name: string;
  categoryId: string;
  pack: string;
  code: string;
  casePrice: number;
  unitPrice: number;
  unitPriceVat: number;
  isActive?: boolean;
}

export interface AdminProductUpdateInput {
  name?: string;
  categoryId?: string;
  pack?: string;
  code?: string;
  casePrice?: number;
  unitPrice?: number;
  unitPriceVat?: number;
  isActive?: boolean;
}

export interface AdminCategoryRow {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export class AdminCatalogError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface CatalogConfig {
  supabaseUrl: string;
  serviceRoleKey: string;
  adminEmails: string[];
  authorizationHeader?: string | string[];
}

function parseBearerToken(header?: string | string[]): string | null {
  const value = Array.isArray(header) ? header[0] : header;
  if (!value) return null;
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? null;
}

function normalizeAdminEmails(adminEmails: string[]): string[] {
  return adminEmails.map((email) => email.trim().toLowerCase()).filter(Boolean);
}

function createAdminClient(config: CatalogConfig) {
  return createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

async function requireAdminUser(config: CatalogConfig): Promise<{ admin: ReturnType<typeof createAdminClient>; user: User }> {
  const token = parseBearerToken(config.authorizationHeader);
  if (!token) {
    throw new AdminCatalogError(401, "Sign in to manage catalog.");
  }

  const admin = createAdminClient(config);
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) {
    throw new AdminCatalogError(401, "Your session could not be verified.");
  }

  const allowedEmails = normalizeAdminEmails(config.adminEmails);
  if (allowedEmails.length === 0) {
    throw new AdminCatalogError(403, "Admin access is not configured yet. Add ADMIN_EMAILS on the server.");
  }

  const userEmail = data.user.email?.toLowerCase() ?? "";
  if (!allowedEmails.includes(userEmail)) {
    throw new AdminCatalogError(403, "Your account does not have admin access.");
  }

  return { admin, user: data.user };
}

function normalizeProductRow(row: Record<string, unknown>): AdminProductRow {
  return {
    id: String(row.id),
    productId: String(row.product_id),
    name: String(row.name),
    category: String(row.category ?? ""),
    categoryId: String(row.category_id ?? ""),
    pack: String(row.pack),
    code: String(row.code),
    casePrice: Number(row.case_price ?? 0),
    unitPrice: Number(row.unit_price ?? 0),
    unitPriceVat: Number(row.unit_price_vat ?? 0),
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function normalizeCategoryRow(row: Record<string, unknown>): AdminCategoryRow {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

export async function loadAdminProducts(
  config: CatalogConfig,
  limit = 50,
  offset = 0,
  search?: string,
): Promise<{ products: AdminProductRow[]; total: number }> {
  const { admin } = await requireAdminUser(config);

  let query = admin
    .from("products")
    .select(`
      id,
      product_id,
      name,
      pack,
      code,
      case_price,
      unit_price,
      unit_price_vat,
      is_active,
      created_at,
      updated_at,
      product_categories!products_category_id_fkey (
        name,
        category_id
      )
    `)
    .order("name", { ascending: true })
    .range(offset, offset + limit - 1);

  if (search && search.trim()) {
    const searchTerm = `%${search.trim().toLowerCase()}%`;
    query = query.or(`name.ilike.${searchTerm},code.ilike.${searchTerm},pack.ilike.${searchTerm}`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error("Unable to load products.");
  }

  // Get total count
  let countQuery = admin.from("products").select("*", { count: "exact", head: true });
  if (search && search.trim()) {
    const searchTerm = `%${search.trim().toLowerCase()}%`;
    countQuery = countQuery.or(`name.ilike.${searchTerm},code.ilike.${searchTerm},pack.ilike.${searchTerm}`);
  }
  const { count } = await countQuery;

  const products = ((data as Array<Record<string, unknown>>) ?? []).map((row) => {
    const category = row.product_categories as Record<string, unknown> | null;
    return {
      id: String(row.id),
      productId: String(row.product_id),
      name: String(row.name),
      category: category ? String(category.name) : "",
      categoryId: String(row.category_id),
      pack: String(row.pack),
      code: String(row.code),
      casePrice: Number(row.case_price ?? 0),
      unitPrice: Number(row.unit_price ?? 0),
      unitPriceVat: Number(row.unit_price_vat ?? 0),
      isActive: Boolean(row.is_active),
      createdAt: String(row.created_at ?? ""),
      updatedAt: String(row.updated_at ?? ""),
    };
  });

  return { products, total: count ?? 0 };
}

export async function loadAdminCategories(config: CatalogConfig): Promise<AdminCategoryRow[]> {
  const { admin } = await requireAdminUser(config);

  const { data, error } = await admin
    .from("product_categories")
    .select("id, name, slug, created_at, updated_at")
    .order("name", { ascending: true });

  if (error) {
    throw new Error("Unable to load categories.");
  }

  return ((data as Array<Record<string, unknown>>) ?? []).map(normalizeCategoryRow);
}

export async function createAdminProduct(
  config: CatalogConfig,
  input: AdminProductInput,
): Promise<AdminProductRow> {
  const { admin, user } = await requireAdminUser(config);

  // Check for duplicate code
  const { data: existing } = await admin
    .from("products")
    .select("id")
    .eq("code", input.code)
    .single();

  if (existing) {
    throw new AdminCatalogError(400, "A product with this code already exists.");
  }

  const productId = `p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const { data, error } = await admin
    .from("products")
    .insert({
      product_id: productId,
      name: input.name,
      category_id: input.categoryId,
      pack: input.pack,
      code: input.code,
      case_price: input.casePrice,
      unit_price: input.unitPrice,
      unit_price_vat: input.unitPriceVat,
      is_active: input.isActive ?? true,
    })
    .select()
    .single();

  if (error || !data) {
    throw new AdminCatalogError(400, error?.message || "Unable to create product.");
  }

  // Get category name
  const { data: category } = await admin
    .from("product_categories")
    .select("name")
    .eq("id", input.categoryId)
    .single();

  return {
    id: String(data.id),
    productId: String(data.product_id),
    name: String(data.name),
    category: category ? String(category.name) : "",
    categoryId: String(data.category_id),
    pack: String(data.pack),
    code: String(data.code),
    casePrice: Number(data.case_price),
    unitPrice: Number(data.unit_price),
    unitPriceVat: Number(data.unit_price_vat),
    isActive: Boolean(data.is_active),
    createdAt: String(data.created_at),
    updatedAt: String(data.updated_at),
  };
}

export async function updateAdminProduct(
  config: CatalogConfig,
  productId: string,
  input: AdminProductUpdateInput,
): Promise<AdminProductRow> {
  const { admin } = await requireAdminUser(config);

  // Get current product
  const { data: current } = await admin
    .from("products")
    .select("id, product_id, category_id")
    .eq("id", productId)
    .single();

  if (!current) {
    throw new AdminCatalogError(404, "Product not found.");
  }

  // Check for duplicate code if code is being changed
  if (input.code) {
    const { data: existing } = await admin
      .from("products")
      .select("id")
      .eq("code", input.code)
      .neq("id", productId)
      .single();

    if (existing) {
      throw new AdminCatalogError(400, "A product with this code already exists.");
    }
  }

  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.categoryId !== undefined) updateData.category_id = input.categoryId;
  if (input.pack !== undefined) updateData.pack = input.pack;
  if (input.code !== undefined) updateData.code = input.code;
  if (input.casePrice !== undefined) updateData.case_price = input.casePrice;
  if (input.unitPrice !== undefined) updateData.unit_price = input.unitPrice;
  if (input.unitPriceVat !== undefined) updateData.unit_price_vat = input.unitPriceVat;
  if (input.isActive !== undefined) updateData.is_active = input.isActive;

  const { data, error } = await admin
    .from("products")
    .update(updateData)
    .eq("id", productId)
    .select()
    .single();

  if (error || !data) {
    throw new AdminCatalogError(400, error?.message || "Unable to update product.");
  }

  // Get category name
  const { data: category } = await admin
    .from("product_categories")
    .select("name")
    .eq("id", data.category_id)
    .single();

  return {
    id: String(data.id),
    productId: String(data.product_id),
    name: String(data.name),
    category: category ? String(category.name) : "",
    categoryId: String(data.category_id),
    pack: String(data.pack),
    code: String(data.code),
    casePrice: Number(data.case_price),
    unitPrice: Number(data.unit_price),
    unitPriceVat: Number(data.unit_price_vat),
    isActive: Boolean(data.is_active),
    createdAt: String(data.created_at),
    updatedAt: String(data.updated_at),
  };
}

export async function deleteAdminProduct(
  config: CatalogConfig,
  productId: string,
): Promise<{ ok: boolean; message: string }> {
  const { admin } = await requireAdminUser(config);

  // Check if product exists
  const { data: current } = await admin
    .from("products")
    .select("id, name")
    .eq("id", productId)
    .single();

  if (!current) {
    throw new AdminCatalogError(404, "Product not found.");
  }

  // Check if product has inventory
  const { data: inventory } = await admin
    .from("inventory_levels")
    .select("id")
    .eq("product_id", productId)
    .single();

  if (inventory) {
    throw new AdminCatalogError(400, "Cannot delete product with inventory. Remove inventory first.");
  }

  const { error } = await admin
    .from("products")
    .delete()
    .eq("id", productId);

  if (error) {
    throw new AdminCatalogError(400, error.message || "Unable to delete product.");
  }

  return { ok: true, message: `Product "${current.name}" deleted successfully.` };
}

export async function createAdminCategory(
  config: CatalogConfig,
  name: string,
): Promise<AdminCategoryRow> {
  const { admin } = await requireAdminUser(config);

  // Check for duplicate name
  const { data: existing } = await admin
    .from("product_categories")
    .select("id")
    .ilike("name", name)
    .single();

  if (existing) {
    throw new AdminCatalogError(400, "A category with this name already exists.");
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const { data, error } = await admin
    .from("product_categories")
    .insert({ name, slug })
    .select()
    .single();

  if (error || !data) {
    throw new AdminCatalogError(400, error?.message || "Unable to create category.");
  }

  return normalizeCategoryRow(data as Record<string, unknown>);
}