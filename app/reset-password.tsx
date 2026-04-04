import { supabase } from "@/services/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const processedCodeRef = useRef<string | null>(null);

  const processCode = async (code: string) => {
    if (!code || processedCodeRef.current === code) return;
    processedCodeRef.current = code;

    setVerifyingCode(true);
    console.log("🔗 EXCHANGING CODE FOR SESSION:", code);
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("❌ PKCE Exchange Error:", error);
      Alert.alert("เชื่อมต่อไม่สำเร็จ", error.message);
    } else {
      console.log("✅ PKCE Exchange Success — session ready");
      setSessionReady(true);
    }
    setVerifyingCode(false);
  };

  // ===== 1) หลัก: ดึง ?code= จาก Expo Router params (deep link) =====
  useEffect(() => {
    if (params.code && typeof params.code === "string") {
      processCode(params.code);
    }
  }, [params.code]);

  // ===== 2) Fallback: ฟัง onAuthStateChange + เช็ค session + Linking =====
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("🔑 AUTH EVENT:", event, "session:", !!session);
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setSessionReady(true);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      console.log("🔍 EXISTING SESSION:", !!data?.session);
      if (data?.session) {
        setSessionReady(true);
      }
    });

    // Linking fallback (กรณี Expo Router ไม่ส่ง params มา)
    const handleUrl = async (url: string | null) => {
      console.log("🔗 LINKING URL:", url);
      if (!url) return;

      try {
        if (url.includes("error_description=")) {
          const errorMatch = url.match(/error_description=([^&]+)/);
          const errorMsg = errorMatch ? decodeURIComponent(errorMatch[1].replace(/\+/g, " ")) : "ลิงก์หมดอายุหรือไม่ถูกต้อง";
          Alert.alert("ลิงก์มีปัญหา", errorMsg);
          return;
        }

        if (url.includes("code=")) {
          const codeMatch = url.match(/code=([^&#]+)/);
          if (codeMatch && codeMatch[1]) {
            processCode(codeMatch[1]);
            return;
          }
        }
      } catch (error) {
        console.error("URL Parsing Error:", error);
      }
    };

    Linking.getInitialURL().then(handleUrl);
    const linkSubscription = Linking.addEventListener("url", (e) =>
      handleUrl(e.url),
    );

    return () => {
      linkSubscription.remove();
      subscription.unsubscribe();
    };
  }, []);

  const handleUpdatePassword = async () => {
    if (password.length < 6) {
      Alert.alert("แจ้งเตือน", "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("แจ้งเตือน", "รหัสผ่านทั้งสองช่องไม่ตรงกัน กรุณากรอกใหม่");
      return;
    }

    setLoading(true);

    try {
      // ดักเช็คก่อนว่ามี Session จริงๆ หรือยัง ป้องกัน Error เด้ง
      const { data, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !data?.session) {
        setLoading(false);
        Alert.alert(
          "ข้อผิดพลาด",
          "เซสชันหมดอายุหรือไม่ถูกต้อง กรุณากดลิงก์จากอีเมลใหม่อีกครั้ง",
        );
        return;
      }

      // ทำการอัปเดตรหัสผ่าน
      const { data: updateData, error } = await supabase.auth.updateUser({ password });

      if (error) {
        Alert.alert("เกิดข้อผิดพลาด", error.message);
      } else {
        // ลงชื่อออกให้ผู้ใช้เพื่อความปลอดภัย และบังคับให้เข้าสู่ระบบใหม่ด้วยรหัสผ่านใหม่
        await supabase.auth.signOut();
        
        Alert.alert("สำเร็จ", "กำหนดรหัสผ่านใหม่เรียบร้อยแล้ว", [
          { text: "ตกลงเข้าสู่ระบบ", onPress: () => router.replace("/login") },
        ]);
        setPassword("");
        setConfirmPassword("");
      }
    } catch (err: any) {
      console.error("Update Password Error:", err);
      Alert.alert("เกิดข้อผิดพลาด", err?.message || "ไม่สามารถอัปเดตรหัสผ่านได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Ionicons name="key" size={40} color="#10B981" />
        </View>
        <Text style={styles.title}>ตั้งรหัสผ่านใหม่</Text>
        <Text style={styles.subtitle}>
          กรุณากำหนดรหัสผ่านใหม่ของคุณเพื่อใช้งานต่อ
        </Text>

        {/* แสดงสถานะ session */}
        <View style={[styles.statusBadge, sessionReady ? styles.statusReady : styles.statusNotReady]}>
          {verifyingCode ? (
            <ActivityIndicator size="small" color="#D97706" style={{ marginRight: 4 }} />
          ) : (
            <Ionicons
              name={sessionReady ? "checkmark-circle" : "time-outline"}
              size={18}
              color={sessionReady ? "#059669" : "#D97706"}
            />
          )}
          <Text style={[styles.statusText, sessionReady ? { color: "#059669" } : { color: "#D97706" }]}>
            {sessionReady ? "พร้อมตั้งรหัสผ่านใหม่" : verifyingCode ? "กำลังตรวจสอบการเชื่อมต่อ..." : "กำลังรอเชื่อมต่อ... กรุณากดลิงก์จากอีเมล"}
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>รหัสผ่านใหม่</Text>
          <TextInput
            style={styles.input}
            placeholder="อย่างน้อย 6 ตัวอักษร"
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>ยืนยันรหัสผ่านใหม่</Text>
          <TextInput
            style={styles.input}
            placeholder="กรอกรหัสผ่านอีกครั้ง"
            placeholderTextColor="#9ca3af"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, (!sessionReady || loading) && { opacity: 0.6 }]}
          onPress={handleUpdatePassword}
          disabled={loading || !sessionReady}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>บันทึกรหัสผ่านใหม่</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace("/login")}
        >
          <Text style={styles.backButtonText}>กลับไปหน้าล็อกอิน</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 28,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    alignItems: "center",
  },
  iconContainer: {
    width: 80,
    height: 80,
    backgroundColor: "#D1FAE5",
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    marginBottom: 16,
    textAlign: "center",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 20,
    width: "100%",
    gap: 8,
  },
  statusReady: {
    backgroundColor: "#D1FAE5",
  },
  statusNotReady: {
    backgroundColor: "#FEF3C7",
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  inputContainer: {
    width: "100%",
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
    marginLeft: 4,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#111827",
  },
  primaryButton: {
    width: "100%",
    backgroundColor: "#10B981",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  backButton: {
    marginTop: 20,
    alignItems: "center",
    padding: 8,
  },
  backButtonText: {
    color: "#6B7280",
    fontSize: 15,
    fontWeight: "600",
  },
});
