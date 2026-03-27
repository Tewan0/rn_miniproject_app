import { supabase } from "@/services/supabase";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function Index() {
  const router = useRouter(); // ใช้สำหรับเปลี่ยนหน้าใน Expo Router
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // เริ่มแอนิเมชันตอนโหลดหน้า
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    // หน่วงเวลาก่อนตรวจสอบ Session
    const timer = setTimeout(() => {
      checkSession();
    }, 3000);

    return () => clearTimeout(timer);
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
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name="home-heart"
            size={100}
            color="#FF6B6B"
          />
        </View>
        <Text style={styles.title}>Family Hub</Text>
        <View style={styles.subtitleContainer}>
          <Text style={styles.subtitle}>
            แอปพลิเคชันบริหารจัดการ การซื้อของเข้าบ้านของครอบครัว
          </Text>
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#FF6B6B" />
          <Text style={styles.loadingText}>กำลังโหลดข้อมูล...</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FEF7F4", // พื้นหลังสีครีม/พีชอ่อนๆ ดูอบอุ่น
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    padding: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 75,
    shadowColor: "#FF6B6B",
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
    marginBottom: 28,
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    color: "#2D3748",
    marginBottom: 10,
    letterSpacing: 0.8,
  },
  subtitle: {
    fontSize: 16,
    color: "#718096",
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 26,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },
  loadingText: {
    marginLeft: 16,
    color: "#4A5568",
    fontSize: 16,
    fontWeight: "600",
  },
  subtitleContainer: {
    paddingHorizontal: 36,
    marginTop: 2,
    marginBottom: 48,
    justifyContent: "center",
    alignItems: "center",
  },
});
