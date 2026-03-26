import { supabase } from "@/services/supabase";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

export default function SplashScreen() {
  const router = useRouter(); // ใช้สำหรับเปลี่ยนหน้าใน Expo Router

  useEffect(() => {
    checkSession();
  }, []);

  // ฟังก์ชันตรวจสอบว่าผู้ใช้เคยล็อกอินไว้หรือไม่
  const checkSession = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      // ถ้ามี Session (เคยล็อกอินแล้ว) ให้เปลี่ยนไปหน้าเลือกห้อง
      router.replace("/rooms");
    } else {
      // ถ้าไม่มี ให้ไปหน้าล็อกอิน
      router.replace("/login");
    }
  };

  return (
    <View style={styles.container}>
      {/* แสดงไอคอนหมุนโหลดข้อมูล */}
      <ActivityIndicator size="large" color="#0000ff" />
      <Text style={{ marginTop: 20 }}>กำลังโหลดข้อมูล...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
});
