import { supabase } from "@/services/supabase";
import { Ionicons } from "@expo/vector-icons"; // Built-in icon in Expo
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import React, { useState } from "react";
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

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert("แจ้งเตือน", "กรุณากรอกอีเมล");
      return;
    }

    setLoading(true);
    const redirectUrl = Linking.createURL("/reset-password");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    setLoading(false);

    if (error) {
      Alert.alert("เกิดข้อผิดพลาด", error.message);
    } else {
      Alert.alert("สำเร็จ", "ลิงก์รีเซ็ตรหัสผ่านถูกส่งแล้ว เช็คอีเมลของคุณ", [
        { text: "ตกลง", onPress: () => router.back() },
      ]);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backIcon} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Ionicons name="lock-closed" size={40} color="#FF6B6B" />
        </View>
        <Text style={styles.title}>ลืมรหัสผ่าน</Text>
        <Text style={styles.subtitle}>
          กรุณากรอกอีเมลที่ใช้สมัครสมาชิก
          เราจะส่งลิงก์สำหรับสร้างรหัสผ่านใหม่ไปให้คุณทางอีเมล
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>ระบุอีเมล</Text>
          <TextInput
            style={styles.input}
            placeholder="example@mail.com"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleResetPassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>ส่งลิงก์กู้คืน</Text>
          )}
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
  header: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 10,
  },
  backIcon: {
    padding: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
    backgroundColor: "#EEF2FF",
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
    lineHeight: 22,
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
    backgroundColor: "#FF6B6B",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF6B6B",
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
});
