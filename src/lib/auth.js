export const deriveRole = (email) =>
  (email || '').toLowerCase().includes('admin') ? 'admin' : 'employee';