import { Navigate } from "react-router-dom";
import { getDefaultAdminSection, hasAdminPermission } from "../../../shared/adminAccess";
import { useAdminOutlet } from "./useAdminOutlet";
import AdminAccessNotice from "./AdminAccessNotice";

export default function AdminRedirect() {
  const { access } = useAdminOutlet();
  const section = access ? getDefaultAdminSection(access) : null;

  if (!access || !section) {
    return <AdminAccessNotice title="No admin sections assigned" description="Your account is active, but no dashboard sections are assigned to it yet." />;
  }

  if (!hasAdminPermission(access, "admin.access")) {
    return <AdminAccessNotice title="Admin access blocked" description="Your account is missing base admin access." />;
  }

  return <Navigate to={`/admin/${section}`} replace />;
}
