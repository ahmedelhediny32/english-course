import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import StudentDashboard from "../../components/StudentDashboard";
import { getStudentSession, setStudentSession } from "../../lib/session";
import { COLORS } from "../../lib/ui";

export default function StudentPage() {
  const router = useRouter();
  const [student, setStudent] = useState(null);

  useEffect(() => {
    const s = getStudentSession();
    if (!s) router.replace("/student/login");
    else setStudent(s);
  }, []);

  if (!student) return <div style={{ background: COLORS.paper, minHeight: "100vh" }} />;

  return (
    <div style={{ background: COLORS.paper, minHeight: "100vh" }}>
      <StudentDashboard student={student} onLogout={() => { setStudentSession(null); router.push("/"); }} />
    </div>
  );
}
