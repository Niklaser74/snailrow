// Bumped when the shipped files change, so the menu can show what is running.
// Keep it in step with the sw.js cache version.
export const APP_VERSION = 'v6';
// Snigelpost (remote play). The Supabase publishable key is public by design:
// every table is closed and the RPCs check auth.uid(). Same project and
// accounts as the other snail games; the tables are prefixed snailrow_.
export const SUPABASE_URL = 'https://lygpfumngyebxoqqncet.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_Nmes72jfyETXQZsiYjsokw_tMusjKI-';
// Web Push (VAPID) public key; the private half lives in Supabase Vault.
export const VAPID_PUBLIC_KEY = 'BG_p9tfa6FCNA-aqH4D0fiVfn0tnvLcwVYGtoAOA6NpDi-Mv6SojFcltzXZutx6GgAenDLeEe07dXve6iUS21mI';
