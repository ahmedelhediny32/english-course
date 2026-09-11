async function postJson(url, body) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: { error: "Network error — check your connection and try again." } };
  }
}

export async function loadAllData() {
  const res = await fetch("/api/data");
  if (!res.ok) throw new Error("Failed to load data");
  return res.json();
}

export async function adminLogin(pin) {
  const { data } = await postJson("/api/auth/admin-login", { pin });
  return !!data.ok;
}

export async function loginAccount(role, email, password, name) {
  const { data } = await postJson("/api/auth/login", { role, email, password, name });
  return data;
}

export async function changeAdminPin(pin) {
  const { ok, data } = await postJson("/api/auth/admin-pin", { pin });
  return { ok, message: data.error };
}

export async function changeAdminAccount(email, password) {
  const { ok, data } = await postJson("/api/auth/admin-pin", { email, password });
  return { ok, message: data.error };
}

export async function studentLogin(name, pin) {
  const { data } = await postJson("/api/auth/student-login", { name, pin });
  return data; // { ok, student } or { ok:false, reason, message }
}

export async function addMonth(name, date) {
  const { data } = await postJson("/api/months", { name, date });
  return data;
}

export async function saveQuizApi(quiz) {
  const { data } = await postJson("/api/quizzes", quiz);
  return data;
}

export async function deleteQuizApi(id) {
  const res = await fetch(`/api/quizzes?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  return res.json();
}

export async function submitQuizApi(payload) {
  const { ok, data } = await postJson("/api/submissions", payload);
  return { ok, ...data };
}

export async function gradeSubmissionApi(payload) {
  const { data } = await postJson("/api/submissions/grade", payload);
  return data;
}

export async function saveRecordingApi(quizId, studentId, itemId, data) {
  await postJson("/api/recordings", { quizId, studentId, itemId, data });
}

export async function getRecordingApi(quizId, studentId, itemId) {
  const res = await fetch(`/api/recordings?quizId=${encodeURIComponent(quizId)}&studentId=${encodeURIComponent(studentId)}&itemId=${encodeURIComponent(itemId)}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.data || null;
}

export async function resetStudentPinApi(studentId, pin) {
  const { data } = await postJson("/api/students/reset-pin", { studentId, pin });
  return data;
}

export async function createStudentAccountApi(name, email, password) {
  const { ok, data } = await postJson("/api/students/create", { name, email, password });
  return { ok, ...data };
}

export async function loadProgressApi(monthId) {
  const res = await fetch(`/api/progress?monthId=${encodeURIComponent(monthId)}`);
  if (!res.ok) throw new Error("Failed to load progress");
  return res.json();
}

export async function loadStudentProgressApi(studentId) {
  const res = await fetch(`/api/progress?studentId=${encodeURIComponent(studentId)}`);
  if (!res.ok) throw new Error("Failed to load student progress");
  return res.json();
}

export async function saveProgressApi(payload) {
  const { ok, data } = await postJson("/api/progress", payload);
  return { ok, ...data };
}
