import type { AdminDashboardPayload } from "../../../shared/adminDashboard";
import type { Product } from "@/data/products";

export type AdminWorkspaceData = {
  accessToken: string | null;
  products: Product[];
  inventory: Array<{
    product_id: string;
    name: string;
    location_code: string;
    location_name: string;
    on_hand_cases: number;
    reserved_cases: number;
    available_cases: number;
    reorder_level_cases: number;
    updated_at: string;
  }>;
  adminData: AdminDashboardPayload | undefined;
  paymentsLoading: boolean;
  paymentsError: unknown;
  refetchAll: () => void;
};

