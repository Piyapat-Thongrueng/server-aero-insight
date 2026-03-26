import { createClient } from "@supabase/supabase-js";

// supabase: ใช้ ANON KEY สำหรับ auth operations ทั่วไป เช่น signIn, signUp, getUser
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
);

// supabaseAdmin: ใช้ SERVICE_ROLE_KEY สำหรับ admin operations ที่ต้องการสิทธิ์สูง
// เช่น updateUserById, deleteUser — ห้าม expose key นี้ให้ฝั่ง client เด็ดขาด
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export { supabase, supabaseAdmin };
