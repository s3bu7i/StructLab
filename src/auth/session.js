export const demoAccounts = {
  student: { name: 'Ali Rahimov', email: 'ali@demo.com', role: 'student' },
  company: { name: 'BakuBuild Co.', email: 'hr@bakubuild.az', role: 'company' },
  admin: { name: 'StructLab Admin', email: 'admin@structlab.az', role: 'admin' },
};

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

export function getSession() {
  return readJson('sl_user', null);
}

export function saveSession(user) {
  const safeUser = {
    name: String(user.name || 'StructLab User').trim(),
    email: String(user.email || '').trim().toLowerCase(),
    role: ['student', 'company', 'admin'].includes(user.role) ? user.role : 'student',
  };
  localStorage.setItem('sl_user', JSON.stringify(safeUser));
  return safeUser;
}

export function listUsers() {
  const stored = readJson('sl_users', []);
  const users = Array.isArray(stored) ? stored : [];
  Object.values(demoAccounts).forEach((account) => {
    if (!users.some((user) => String(user.email).toLowerCase() === account.email)) users.push(account);
  });
  localStorage.setItem('sl_users', JSON.stringify(users));
  return users;
}

export function loginLocalAccount(email, roleHint = 'student') {
  const normalizedEmail = email.trim().toLowerCase();
  const users = listUsers();
  let user = users.find((entry) => String(entry.email).toLowerCase() === normalizedEmail);

  if (!user) {
    const prefix = normalizedEmail.split('@')[0] || 'User';
    const inferredRole = normalizedEmail.includes('admin')
      ? 'admin'
      : normalizedEmail.includes('hr') || normalizedEmail.includes('company')
        ? 'company'
        : roleHint;
    user = {
      name: prefix.replace(/[._-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
      email: normalizedEmail,
      role: inferredRole,
    };
    users.push(user);
    localStorage.setItem('sl_users', JSON.stringify(users));
  }

  return saveSession(user);
}

export function createLocalAccount({ name, email, role }) {
  const users = listUsers();
  const normalizedEmail = email.trim().toLowerCase();
  const existing = users.find((entry) => String(entry.email).toLowerCase() === normalizedEmail);
  const user = existing || { name: name.trim(), email: normalizedEmail, role };
  if (!existing) {
    users.push(user);
    localStorage.setItem('sl_users', JSON.stringify(users));
  }
  return saveSession(user);
}

export function updateLocalProfile(updates) {
  const current = getSession();
  if (!current) return null;
  const updated = saveSession({ ...current, ...updates, role: current.role });
  const users = listUsers().map((user) => (
    String(user.email).toLowerCase() === current.email.toLowerCase() ? updated : user
  ));
  localStorage.setItem('sl_users', JSON.stringify(users));
  return updated;
}

export function logoutLocalAccount() {
  localStorage.removeItem('sl_user');
}

export function readLocalCollection(key, fallback) {
  return readJson(key, fallback);
}

export function writeLocalCollection(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
