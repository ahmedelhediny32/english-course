export function getAdminSession() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("qn_admin") === "1";
}
export function setAdminSession(v) {
  if (v) localStorage.setItem("qn_admin", "1");
  else localStorage.removeItem("qn_admin");
}
export function getStudentSession() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem("qn_student") || "null");
  } catch (e) {
    return null;
  }
}
export function setStudentSession(student) {
  if (student) localStorage.setItem("qn_student", JSON.stringify(student));
  else localStorage.removeItem("qn_student");
}

export function setUserSession(user) {
  if (typeof window === "undefined") return;
  if (user) localStorage.setItem("qn_user", JSON.stringify(user));
  else localStorage.removeItem("qn_user");
}
