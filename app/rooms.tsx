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

  const [rooms, setRooms] = useState<any[]>([]); // State เก็บข้อมูลห้องทั้งหมด
  const [newRoomName, setNewRoomName] = useState(""); // State เก็บชื่อห้องใหม่ที่จะสร้าง
  // State สำหรับฟีเจอร์กรอกรหัสเข้าห้อง
  const [joinCode, setJoinCode] = useState("");

  // โหลดรายชื่อห้องทันทีที่เปิดหน้านี้
  useEffect(() => {
    fetchRooms();
  }, []);

  // ฟังก์ชันดึงข้อมูลห้องจากฐานข้อมูล
  const fetchRooms = async () => {
    const { data, error } = await supabase.from("family_rooms").select("*");
    if (!error && data) setRooms(data);
  };

  // ฟังก์ชันสร้างห้องใหม่
  const handleCreateRoom = async () => {
    if (!newRoomName) return; // ถ้าไม่ได้กรอกชื่อให้หยุดการทำงาน
    
    // ดึงข้อมูลผู้ใช้งานปัจจุบัน
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // สร้างรหัสห้องแบบสุ่ม 6 ตัวอักษร
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // บันทึกห้องใหม่ลงฐานข้อมูล
    const { error } = await supabase
      .from("family_rooms")
      .insert([
        { name: newRoomName, room_code: roomCode, creator_id: user.id },
      ]);

    if (error) Alert.alert("Error", error.message);
    else {
      setNewRoomName(""); // ล้างช่องกรอกข้อความ
      fetchRooms(); // ดึงข้อมูลห้องมาใหม่
    }
  };

  // ฟังก์ชันเข้าร่วมห้อง
  const handleJoinRoom = async () => {
    if (!joinCode) return; // ถ้าไม่ได้ระบุรหัสให้หยุดการทำงาน
    
    // ดึงข้อมูลผู้ใช้งานปัจจุบัน
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // ค้นหาห้องจากรหัสที่กรอก
    const { data: roomData, error: roomError } = await supabase
      .from("family_rooms")
      .select("id")
      .eq("room_code", joinCode)
      .single();

    if (roomError || !roomData)
      return Alert.alert("ไม่พบห้อง", "รหัสห้องไม่ถูกต้อง");

    // นำชื่อผู้ใช้เข้าไปเป็นสมาชิกของห้อง
    const { error } = await supabase
      .from("room_members")
      .insert([{ room_id: roomData.id, user_id: user.id, role: "member" }]);

    if (error) Alert.alert("Error", error.message);
    else {
      setJoinCode(""); // ล้างช่องกรอกข้อความ
      fetchRooms(); // ดึงข้อมูลใหม่
      Alert.alert("สำเร็จ", "เข้าร่วมครอบครัวแล้ว!");
    }
  };

  // ฟังก์ชันออกจากระบบ
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login"); // เมื่อกดออกระบบให้เปลี่ยนไปหน้า login
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

      {/* UI สำหรับกรอกรหัสเข้าร่วมห้อง */}
      <View style={styles.actionBox}>
        <TextInput
          style={styles.input}
          placeholder="รหัสเข้าห้อง..."
          value={joinCode}
          onChangeText={setJoinCode}
        />
        <Button
          title="เข้าร่วมห้องด้วยรหัส"
          onPress={handleJoinRoom}
          color="orange"
        />
      </View>

      <Text style={styles.subtitle}>ห้องของคุณ:</Text>

      {/* ลิสต์แสดงห้องที่ผู้ใช้เป็นสมาชิก */}

      <FlatList
        data={rooms}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          // กดที่การ์ดเพื่อนำทางไปหน้ารายละเอียดห้อง และส่งพารามิเตอร์ไปใช้งาน
          <TouchableOpacity
            style={styles.roomCard}
            onPress={() =>
              router.push({
                pathname: "/[roomId]",
                params: {
                  roomId: item.id,
                  roomName: item.name,
                  roomCode: item.room_code,
                },
              })
            }
          >
            <Text style={styles.roomName}>{item.name}</Text>
            <Text>รหัสเชิญ: {item.room_code}</Text>
          </TouchableOpacity>
        )}
      />

      {/* ปุ่มออกจากระบบ สำหรับกลับไปสู่หน้าลงชื่อเข้าใช้ */}
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
