import { supabase } from "@/services/supabase";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Button, StyleSheet, Text, TextInput, View } from "react-native";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // ฟังก์ชันเข้าสู่ระบบ
  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      Alert.alert("เข้าสู่ระบบล้มเหลว", error.message);
    } else {
      router.replace("/rooms"); // ล็อกอินผ่าน ให้ไปหน้า rooms
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>เข้าสู่ระบบ</Text>

      {/* ช่องกรอกอีเมล */}
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      {/* ช่องกรอกรหัสผ่าน */}
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Button title="เข้าสู่ระบบ" onPress={handleLogin} />
      <View style={styles.space} />

      {/* ปุ่มไปหน้าสมัครสมาชิก */}
      <Button
        title="สมัครสมาชิกใหม่"
        onPress={() => router.push("/register")}
        color="green"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center" },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: { borderWidth: 1, padding: 10, marginBottom: 15, borderRadius: 5 },
  space: { height: 10 },
});
