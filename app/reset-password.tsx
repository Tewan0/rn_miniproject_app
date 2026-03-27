import { supabase } from "@/services/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (!url) return;

      try {
        // 1. รองรับ Supabase แบบใหม่ (PKCE Flow) จะได้ URL ที่มี ?code=...
        if (url.includes("code=")) {
          const queryString = url.split("?")[1]?.split("#")[0];
          const params = queryString?.split("&").reduce(
            (acc, current) => {
              const [key, value] = current.split("=");
              acc[key] = value;
              return acc;
            },
            {} as Record<string, string>,
          );

          if (params?.code) {
            // ใช้ code แลกเปลี่ยนเป็น Session อัตโนมัติ
            await supabase.auth.exchangeCodeForSession(params.code);
            return;
          }
        }

        // 2. รองรับ Supabase แบบเก่า (Implicit Flow) จะได้ URL ที่มี #access_token=...
        if (url.includes("access_token=")) {
          const fragment = url.split("#")[1];
          if (fragment) {
            const params = fragment.split("&").reduce(
              (acc, current) => {
                const [key, value] = current.split("=");
                acc[key] = value;
                return acc;
              },
              {} as Record<string, string>,
            );

            const access_token = params["access_token"];
            const refresh_token = params["refresh_token"];

            if (access_token && refresh_token) {
              await supabase.auth.setSession({ access_token, refresh_token });
            }
          }
        }
      } catch (error) {
        console.error("URL Parsing Error:", error);
      }
    };

    Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener("url", (e) =>
      handleUrl(e.url),
    );

    return () => subscription.remove();
  }, []);

  const handleUpdatePassword = async () => {
    if (password.length < 6) {
      Alert.alert("แจ้งเตือน", "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }

    setLoading(true);

    // ดักเช็คก่อนว่ามี Session จริงๆ หรือยัง ป้องกัน Error เด้ง
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setLoading(false);
      Alert.alert(
        "ข้อผิดพลาด",
        "เซสชันหมดอายุหรือไม่ถูกต้อง กรุณากดลิงก์จากอีเมลใหม่อีกครั้ง",
      );
      return;
    }

    // ทำการอัปเดตรหัสผ่าน
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      Alert.alert("เกิดข้อผิดพลาด", error.message);
    } else {
      Alert.alert("สำเร็จ", "กำหนดรหัสผ่านใหม่เรียบร้อยแล้ว", [
        { text: "ตกลงเข้าสู่ระบบ", onPress: () => router.replace("/login") },
      ]);
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

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleUpdatePassword}
          disabled={loading}
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
    marginBottom: 28,
    textAlign: "center",
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
