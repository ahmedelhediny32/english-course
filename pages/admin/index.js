import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AdminDashboard from "../../components/AdminDashboard";
import { getAdminSession, setAdminSession } from "../../lib/session";
import { COLORS } from "../../lib/ui";

export default function AdminPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getAdminSession()) router.replace("/admin/login");
    else setReady(true);
  }, []);

  if (!ready) return <div style={{ background: COLORS.paper, minHeight: "100vh" }} />;

  return (
    <div style={{ background: COLORS.paper, minHeight: "100vh" }}>
      <AdminDashboard onLogout={() => { setAdminSession(false); router.push("/"); }} />
    </div>
  );
}
