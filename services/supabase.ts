// นำเข้า AsyncStorage เพื่อใช้ทำระบบจำรหัสผ่าน (ไม่ต้องล็อกอินใหม่ทุกครั้ง)
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
// นำเข้า polyfill สำหรับ React Native เพื่อให้ Supabase ทำงานได้สมบูรณ์
import "react-native-url-polyfill/auto";

const supabaseUrl = "https://gfccdoyaogowjvieymhy.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmY2Nkb3lhb2dvd2p2aWV5bWh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MTkyODcsImV4cCI6MjA5MDA5NTI4N30.YC3ye1c2s6lpg124h-zfyz6cQGSbGEaiqvQzDbjQEmY";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage, // บอกให้ Supabase เก็บ Session การล็อกอินไว้ในเครื่อง
    autoRefreshToken: true, // ระบบรีเฟรช Token อัตโนมัติ
    persistSession: true, // ระบบจดจำการเข้าระบบ
    detectSessionInUrl: false,
  },
});
