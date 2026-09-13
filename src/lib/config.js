export const SUPABASE_URL = 'https://bvjumsiwjigbcemzejkf.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_OaQ-wAeAwNFBKmgqESBxYQ_ILjZ7Yn3';
export const GOOGLE_WEB_CLIENT_ID = '87290766682-khjtaa1m574e36fa8kde43gm411rm01l.apps.googleusercontent.com';

const devRuntime = typeof __DEV__ !== 'undefined' && __DEV__;
const bypassEnv = typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_BYPASS_AUTH === '1';
const bypassParam =
  typeof window !== 'undefined' && /[?&]devbypass=1/.test(window.location?.search || '');
export const DEV_BYPASS_AUTH = devRuntime && (bypassEnv || bypassParam);
