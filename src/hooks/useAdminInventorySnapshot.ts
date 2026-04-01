import { useQuery } from "@tanstack/react-query";
import { fetchAdminInventorySnapshot, type AdminInventorySnapshotRow } from "@/lib/admin";

export function useAdminInventorySnapshot(accessToken: string | null) {
  return useQuery<AdminInventorySnapshotRow[]>({
    queryKey: ["admin-inventory-snapshot", accessToken],
    queryFn: () => fetchAdminInventorySnapshot(accessToken!),
    enabled: Boolean(accessToken),
    retry: false,
    staleTime: 30 * 1000,
  });
}

