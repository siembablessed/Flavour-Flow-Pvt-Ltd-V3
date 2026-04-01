import { Navigate } from "react-router-dom";

export default function AdminRedirect() {
  return <Navigate to="/admin/overview" replace />;
}

