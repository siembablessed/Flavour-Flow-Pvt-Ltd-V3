import type { AdminProductRow, AdminCategoryRow } from "../../shared/adminCatalog";

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

export interface AdminProductListResponse {
  products: AdminProductRow[];
  total: number;
}

export interface AdminCategoryListResponse {
  categories: AdminCategoryRow[];
}

async function parseJson<T>(response: Response, fallback: string): Promise<T> {
  const payload = (await response.json().catch(() => null)) as { error?: string } | T | null;

  if (!response.ok) {
    const message = payload && typeof payload === "object" && payload !== null && "error" in payload
      ? String((payload as { error?: string }).error || fallback)
      : fallback;
    throw new Error(message);
  }

  return payload as T;
}

export async function fetchAdminProducts(
  accessToken: string,
  limit = 50,
  offset = 0,
  search?: string
): Promise<AdminProductListResponse> {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  if (search) params.set("search", search);

  const response = await fetch(`/api/admin/catalog/products?${params}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return parseJson<AdminProductListResponse>(response, "Unable to load products.");
}

export async function fetchAdminCategories(accessToken: string): Promise<AdminCategoryRow[]> {
  const response = await fetch("/api/admin/catalog/categories", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = await parseJson<AdminCategoryListResponse>(response, "Unable to load categories.");
  return payload.categories;
}

export async function createAdminProduct(
  accessToken: string,
  input: AdminProductInput
): Promise<AdminProductRow> {
  const response = await fetch("/api/admin/catalog/products", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

  return parseJson<AdminProductRow>(response, "Unable to create product.");
}

export async function updateAdminProduct(
  accessToken: string,
  productId: string,
  input: AdminProductUpdateInput
): Promise<AdminProductRow> {
  const params = new URLSearchParams();
  params.set("id", productId);

  const response = await fetch(`/api/admin/catalog/products?${params}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

  return parseJson<AdminProductRow>(response, "Unable to update product.");
}

export async function deleteAdminProduct(
  accessToken: string,
  productId: string
): Promise<{ ok: boolean; message: string }> {
  const params = new URLSearchParams();
  params.set("id", productId);

  const response = await fetch(`/api/admin/catalog/products?${params}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return parseJson<{ ok: boolean; message: string }>(response, "Unable to delete product.");
}

export async function createAdminCategory(
  accessToken: string,
  name: string
): Promise<AdminCategoryRow> {
  const response = await fetch("/api/admin/catalog/products?action=create-category", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ name }),
  });

  return parseJson<AdminCategoryRow>(response, "Unable to create category.");
}