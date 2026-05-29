// lib/supabaseAdmin.js
import { createClient } from '@supabase/supabase-js';

let _client = null;

function getClient() {
  if (!_client) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE;
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Supabase URL or Service Role Key is missing.');
    }
    _client = createClient(supabaseUrl, serviceRoleKey);
  }
  return _client;
}

// リクエスト時にのみ初期化するため、Proxyで遅延初期化する
/** @type {import('@supabase/supabase-js').SupabaseClient} */
export const supabaseAdmin = /** @type {any} */ (new Proxy({}, {
  get(_target, prop) {
    return Reflect.get(getClient(), prop);
  },
}));
