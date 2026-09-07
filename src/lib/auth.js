import { Platform } from 'react-native';
import { supabase, isSupabaseConfigured } from './supabase';
import { GOOGLE_WEB_CLIENT_ID } from './config';

export const deriveRole = (email) =>
  (email || '').toLowerCase().includes('admin') ? 'admin' : 'employee';

export const configureGoogleSignIn = async () => {
  if (Platform.OS === 'web') return;
  const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    scopes: ['profile', 'email'],
  });
};

export const googleSignIn = async () => {
  if (!isSupabaseConfigured) return { error: 'Supabase not configured.' };

  if (Platform.OS === 'web') {
    const loc = window.location;
    const dir = loc.pathname.replace(/[^/]*\.html$/, '');
    const redirectTo = `${loc.origin}${dir.endsWith('/') ? dir : `${dir}/`}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) return { error: error.message };
    return { error: null };
  }

  try {
    const { GoogleSignin, isSuccessResponse, statusCodes } = await import('@react-native-google-signin/google-signin');
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return { error: null };

    const idToken = response.data.idToken;
    if (!idToken) return { error: 'Google did not return an ID token.' };

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });
    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    if (err?.code === 'SIGN_IN_CANCELLED') return { error: null };
    if (err?.code === 'PLAY_SERVICES_NOT_AVAILABLE')
      return { error: 'Google Play Services not available.' };
    return { error: err?.message ?? 'Google sign-in failed.' };
  }
};

// Fetches the caller's profile (role + shop). Creates a profile row on first
// login if the auth trigger hasn't (covers dashboard-created accounts).
export const ensureProfile = async (id, email) => {
  if (!isSupabaseConfigured) return null;
  try {
    const { data } = await supabase
      .from('profiles')
      .select('id, shop_id, role')
      .eq('id', id)
      .maybeSingle();
    if (data?.role) return data;
    const row = { id, email, role: deriveRole(email) };
    await supabase.from('profiles').insert(row);
    return { ...row, shop_id: null };
  } catch (_) {
    return null;
  }
};