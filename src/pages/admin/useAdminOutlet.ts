import { useOutletContext } from "react-router-dom";
import type { AdminWorkspaceData } from "./adminTypes";

export function useAdminOutlet() {
  return useOutletContext<AdminWorkspaceData>();
}

