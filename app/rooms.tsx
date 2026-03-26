import { supabase } from "@/services/supabase";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function RoomScreen() {
  const router = useRouter();
  const [rooms, setRooms] = useState([]);
  const [newRoomName, setNewRoomName] = useState("");

  // โหลดรายชื่อห้องทันทีที่เปิดหน้านี้
  useEffect(() => {
    fetchRooms();
  }, []);

  // ฟังก์ชันดึงข้อมูลห้องที่ผู้ใช้เป็นสมาชิกอยู่
  const fetchRooms = async () => {
    const { data, error } = await supabase.from("family_rooms").select("*");
    if (!error) setRooms(data);
  };

  // ฟังก์ชันสร้างห้องใหม่
  const handleCreateRoom = async () => {
    if (!newRoomName) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // สร้างรหัสห้องแบบสุ่ม 6 ตัวอักษร
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { error } = await supabase
      .from("family_rooms")
      .insert([
        { name: newRoomName, room_code: roomCode, creator_id: user.id },
      ]);

    if (error) Alert.alert("Error", error.message);
    else {
      setNewRoomName("");
      fetchRooms();
    } // ล้างค่าช่องกรอกและโหลดข้อมูลใหม่
  };

  // ฟังก์ชันออกจากระบบ
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login"); // กลับไปหน้าล็อกอิน
  };

  return (
    <View style={styles.container}>
      {/* ส่วนสำหรับสร้างห้องใหม่ */}
      <View style={styles.actionBox}>
        <TextInput
          style={styles.input}
          placeholder="ชื่อห้องใหม่..."
          value={newRoomName}
          onChangeText={setNewRoomName}
        />
        <Button title="สร้างห้องครอบครัว" onPress={handleCreateRoom} />
      </View>

      <Text style={styles.subtitle}>ห้องของคุณ:</Text>

      {/* ลิสต์แสดงห้องที่มีอยู่ */}
      <FlatList
        data={rooms}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          // เมื่อกดที่ห้อง จะส่งข้อมูลห้องผ่านพารามิเตอร์ไปที่หน้า [roomId].js
          <TouchableOpacity
            style={styles.roomCard}
            onPress={() =>
              router.push({
                pathname: `/${item.id}`,
                params: { roomName: item.name, roomCode: item.room_code },
              })
            }
          >
            <Text style={styles.roomName}>{item.name}</Text>
            <Text>รหัสเชิญ: {item.room_code}</Text>
          </TouchableOpacity>
        )}
      />

      {/* ปุ่มออกจากระบบ */}
      <Button title="ออกจากระบบ" onPress={handleLogout} color="red" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  actionBox: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: "#fff",
    borderRadius: 8,
  },
  input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5 },
  subtitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  roomCard: {
    padding: 15,
    backgroundColor: "#e0f7fa",
    marginBottom: 10,
    borderRadius: 8,
  },
  roomName: { fontSize: 16, fontWeight: "bold" },
});
