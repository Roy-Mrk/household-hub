// lib/supabaseAdmin.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE;
if (!supabaseUrl || !serviceRoleKey) {
    console.error('Supabase URL or Anon Key is missing.');
  }
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
