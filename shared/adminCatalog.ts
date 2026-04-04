import { writeAdminAuditLog } from "./adminAudit";
import {
  assertAdminPermission,
  createAdminClient,
  resolveAdminContext,
  type AdminAccessConfig,
} from "./adminAccess";

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

type CatalogConfig = AdminAccessConfig

function mapAuthorizationError(error: unknown): never {
  if (error instanceof Error && "status" in error && typeof error.status === "number") {
    throw new AdminCatalogError(error.status, error.message);
  }

  throw error;
}

async function requireCatalogAccess(config: CatalogConfig, permission: "catalog.read" | "catalog.write") {
  try {
    const context = await resolveAdminContext(config);
    assertAdminPermission(
      context.access,
      permission,
      permission === "catalog.write" ? "You do not have permission to change catalogue data." : "You do not have permission to view catalogue data.",
    );
    return context;
  } catch (error) {
    mapAuthorizationError(error);
  }
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
  const { admin } = await requireCatalogAccess(config, "catalog.read");

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
      category_id,
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
  const { admin } = await requireCatalogAccess(config, "catalog.read");

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
  const { admin, user } = await requireCatalogAccess(config, "catalog.write");

  const { data: existing } = await admin.from("products").select("id").eq("code", input.code).single();
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

  await writeAdminAuditLog(admin, {
    actorId: user.id,
    actorEmail: user.email ?? null,
    action: "catalog.product.create",
    resourceType: "product",
    resourceId: String(data.id),
    details: {
      productId,
      code: input.code,
      name: input.name,
    },
  });

  const { data: category } = await admin.from("product_categories").select("name").eq("id", input.categoryId).single();

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
  const { admin, user } = await requireCatalogAccess(config, "catalog.write");

  const { data: current } = await admin.from("products").select("id, product_id, category_id").eq("id", productId).single();
  if (!current) {
    throw new AdminCatalogError(404, "Product not found.");
  }

  if (input.code) {
    const { data: existing } = await admin.from("products").select("id").eq("code", input.code).neq("id", productId).single();
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

  const { data, error } = await admin.from("products").update(updateData).eq("id", productId).select().single();
  if (error || !data) {
    throw new AdminCatalogError(400, error?.message || "Unable to update product.");
  }

  await writeAdminAuditLog(admin, {
    actorId: user.id,
    actorEmail: user.email ?? null,
    action: "catalog.product.update",
    resourceType: "product",
    resourceId: productId,
    details: input,
  });

  const { data: category } = await admin.from("product_categories").select("name").eq("id", data.category_id).single();

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
  const { admin, user } = await requireCatalogAccess(config, "catalog.write");

  const { data: current } = await admin.from("products").select("id, name").eq("id", productId).single();
  if (!current) {
    throw new AdminCatalogError(404, "Product not found.");
  }

  const { data: inventory } = await admin.from("inventory_levels").select("id").eq("product_id", productId).single();
  if (inventory) {
    throw new AdminCatalogError(400, "Cannot delete product with inventory. Remove inventory first.");
  }

  const { error } = await admin.from("products").delete().eq("id", productId);
  if (error) {
    throw new AdminCatalogError(400, error.message || "Unable to delete product.");
  }

  await writeAdminAuditLog(admin, {
    actorId: user.id,
    actorEmail: user.email ?? null,
    action: "catalog.product.delete",
    resourceType: "product",
    resourceId: productId,
    details: { name: current.name },
  });

  return { ok: true, message: `Product "${current.name}" deleted successfully.` };
}

export async function createAdminCategory(
  config: CatalogConfig,
  name: string,
): Promise<AdminCategoryRow> {
  const { admin, user } = await requireCatalogAccess(config, "catalog.write");

  const { data: existing } = await admin.from("product_categories").select("id").ilike("name", name).single();
  if (existing) {
    throw new AdminCatalogError(400, "A category with this name already exists.");
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const { data, error } = await admin.from("product_categories").insert({ name, slug }).select().single();

  if (error || !data) {
    throw new AdminCatalogError(400, error?.message || "Unable to create category.");
  }

  await writeAdminAuditLog(admin, {
    actorId: user.id,
    actorEmail: user.email ?? null,
    action: "catalog.category.create",
    resourceType: "category",
    resourceId: String(data.id),
    details: { name, slug },
  });

  return normalizeCategoryRow(data as Record<string, unknown>);
}

