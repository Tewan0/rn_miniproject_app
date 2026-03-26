import { useRouter } from "expo-router"; // ใช้สำหรับเปลี่ยนหน้า
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../services/supabase";

export default function RegisterScreen() {
  const router = useRouter();

  // State สำหรับเก็บข้อมูลที่ผู้ใช้กรอก
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // State สำหรับแสดงสถานะกำลังโหลดตอนกดสมัคร
  const [loading, setLoading] = useState(false);

  // ฟังก์ชันจัดการการสมัครสมาชิก
  const handleRegister = async () => {
    // เช็คว่ากรอกข้อมูลครบไหม
    if (!fullName || !email || !password) {
      Alert.alert("แจ้งเตือน", "กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    setLoading(true);

    // เรียกใช้ฟังก์ชัน signUp ของ Supabase
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: fullName, // ส่งชื่อไปบันทึกลงตาราง profiles ผ่าน Trigger ของฐานข้อมูล
        },
      },
    });

    setLoading(false);

    // ตรวจสอบผลลัพธ์
    if (error) {
      Alert.alert("สมัครสมาชิกไม่สำเร็จ", error.message);
    } else {
      Alert.alert("สำเร็จ", "สมัครสมาชิกเรียบร้อยแล้ว กรุณาเข้าสู่ระบบ", [
        { text: "ตกลง", onPress: () => router.replace("/login") }, // สมัครเสร็จให้เด้งกลับไปหน้าล็อกอิน
      ]);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>สร้างบัญชีผู้ใช้ใหม่</Text>

      {/* ช่องกรอกชื่อ-นามสกุล */}
      <TextInput
        style={styles.input}
        placeholder="ชื่อ - นามสกุล"
        value={fullName}
        onChangeText={setFullName}
      />

      {/* ช่องกรอกอีเมล */}
      <TextInput
        style={styles.input}
        placeholder="อีเมล"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none" // ไม่ให้ตัวแรกเป็นตัวใหญ่พิมพ์ใหญ่อัตโนมัติ
        keyboardType="email-address" // เด้งคีย์บอร์ดแบบมีปุ่ม @
      />

      {/* ช่องกรอกรหัสผ่าน */}
      <TextInput
        style={styles.input}
        placeholder="รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry // ซ่อนตัวอักษรเป็นจุดดำ
      />

      {/* ปุ่มสมัครสมาชิก (ถ้ากำลังโหลดให้แสดงไอคอนหมุนๆ แทน) */}
      {loading ? (
        <ActivityIndicator size="large" color="green" />
      ) : (
        <Button title="ยืนยันการสมัคร" onPress={handleRegister} color="green" />
      )}

      <View style={styles.space} />

      {/* ปุ่มยกเลิก/กลับไปหน้าล็อกอิน */}
      <Button
        title="กลับไปหน้าเข้าสู่ระบบ"
        onPress={() => router.back()} // ย้อนกลับไปหน้าก่อนหน้า
        color="gray"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 25,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    marginBottom: 15,
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
  },
  space: {
    height: 15,
  },
});
