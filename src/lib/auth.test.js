import { describe, it, expect, vi } from 'vitest';

vi.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

vi.mock('../lib/supabase', () => ({
  supabase: {},
  isSupabaseConfigured: false,
}));

const { deriveRole } = await import('../lib/auth');

describe('deriveRole', () => {
  it('returns admin when email contains admin', () => {
    expect(deriveRole('admin@shop.com')).toBe('admin');
    expect(deriveRole('owner.admin@gmail.com')).toBe('admin');
  });

  it('returns employee otherwise', () => {
    expect(deriveRole('bob@shop.com')).toBe('employee');
    expect(deriveRole('boss@shop.com')).toBe('employee');
  });

  it('matches admin as a substring anywhere in the email', () => {
    expect(deriveRole('adminassistant@x.com')).toBe('admin');
  });

  it('is case-insensitive', () => {
    expect(deriveRole('ADMIN@x.com')).toBe('admin');
  });

  it('handles null/empty email safely', () => {
    expect(deriveRole(null)).toBe('employee');
    expect(deriveRole('')).toBe('employee');
  });
});
