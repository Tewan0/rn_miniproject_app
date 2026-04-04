import { supabase } from "@/services/supabase";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function RoomScreen() {
  const router = useRouter();

  const [rooms, setRooms] = useState<any[]>([]);
  const [newRoomName, setNewRoomName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // เปลี่ยนจาก useEffect เป็น useFocusEffect
  // เพื่อให้ข้อมูลอัปเดตใหม่ทุกครั้งที่ผู้ใช้เปิดหน้านี้ (เช่น ตอนโดนเตะแล้วกลับมาหน้านี้)
  useFocusEffect(
    useCallback(() => {
      fetchRooms();
    }, []),
  );

  const fetchRooms = async () => {
    // 1. ดึง ID ของ User ที่กำลังใช้งานอยู่
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    // 2. เช็คเฉพาะห้องที่ User คนนี้เป็นสมาชิกอยู่เท่านั้น!
    const { data, error } = await supabase
      .from("room_members")
      .select(
        `
        family_rooms (
          id,
          name,
          room_code,
          creator_id
        )
      `,
      )
      .eq("user_id", user.id); // กรองเอาเฉพาะข้อมูลของตัวเอง

    if (!error && data) {
      // 3. ข้อมูลที่ดึงมาจะซ้อนกันอยู่ ต้องแปลงให้อยู่ในรูปแบบ Array ปกติ
      const myRooms = data
        .map((item: any) => item.family_rooms)
        .filter((room) => room !== null); // กรองค่าว่างทิ้งเผื่อกรณีฉุกเฉิน

      setRooms(myRooms);
    }
  };

  const handleCreateRoom = async () => {
    if (!newRoomName || !currentUserId) return;
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { data: newRoom, error: createError } = await supabase
      .from("family_rooms")
      .insert([
        { name: newRoomName, room_code: roomCode, creator_id: currentUserId },
      ])
      .select()
      .single();

    if (createError) return Alert.alert("ข้อผิดพลาด", createError.message);

    if (newRoom) {
      const { error: memberError } = await supabase
        .from("room_members")
        .insert([
          { room_id: newRoom.id, user_id: currentUserId, role: "admin" },
        ]);
      if (memberError) Alert.alert("ข้อผิดพลาด", memberError.message);
      else {
        setNewRoomName("");
        fetchRooms();
      }
    }
  };

  const handleJoinRoom = async () => {
    if (!joinCode || !currentUserId) return;

    const { data: roomData, error: roomError } = await supabase
      .from("family_rooms")
      .select("id")
      .eq("room_code", joinCode)
      .single();

    if (roomError || !roomData)
      return Alert.alert("ไม่พบห้อง", "รหัสห้องไม่ถูกต้อง");

    const { error } = await supabase
      .from("room_members")
      .insert([
        { room_id: roomData.id, user_id: currentUserId, role: "member" },
      ]);

    if (error) Alert.alert("ข้อผิดพลาด", error.message);
    else {
      setJoinCode("");
      fetchRooms();
      Alert.alert("สำเร็จ", "เข้าร่วมครอบครัวแล้ว!");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <TouchableOpacity
              onPress={handleLogout}
              style={{ marginRight: 5, padding: 5 }}
            >
              <MaterialCommunityIcons name="logout" size={26} color="#FF6B6B" />
            </TouchableOpacity>
          ),
        }}
      />
      <Text style={styles.pageTitle}>Family Rooms</Text>

      {/* กล่องสร้างห้อง */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>สร้างห้องใหม่</Text>
        <TextInput
          style={styles.input}
          placeholder="ตั้งชื่อห้องครอบครัว..."
          placeholderTextColor="#A0AEC0"
          value={newRoomName}
          onChangeText={setNewRoomName}
        />
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleCreateRoom}
        >
          <Text style={styles.buttonText}>สร้างห้อง</Text>
        </TouchableOpacity>
      </View>

      {/* กล่องเข้าร่วมห้อง */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>เข้าร่วมด้วยรหัส</Text>
        <TextInput
          style={styles.input}
          placeholder="กรอกรหัส 6 หลัก..."
          placeholderTextColor="#A0AEC0"
          value={joinCode}
          onChangeText={setJoinCode}
          autoCapitalize="characters"
        />
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: "#F6AD55" }]}
          onPress={handleJoinRoom}
        >
          <Text style={styles.buttonText}>เข้าร่วมห้อง</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>ห้องของคุณ</Text>

      <FlatList
        data={rooms}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={
          <Text
            style={{ textAlign: "center", color: "#A0AEC0", marginTop: 20 }}
          >
            คุณยังไม่มีห้องครอบครัวเลย
          </Text>
        }
        renderItem={({ item }) => {
          const isOwner = currentUserId === item.creator_id;
          return (
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
              <View style={styles.roomCardContent}>
                <MaterialCommunityIcons
                  name="home-group"
                  size={24}
                  color="#FF6B6B"
                />
                <View style={{ marginLeft: 15 }}>
                  <Text style={styles.roomName}>{item.name}</Text>
                  {isOwner ? (
                    <Text style={styles.roomRole}>
                      รหัสเชิญ:{" "}
                      <Text style={{ fontWeight: "bold", color: "#FF6B6B" }}>
                        {item.room_code}
                      </Text>
                    </Text>
                  ) : (
                    <Text style={styles.roomRole}>สถานะ: สมาชิก</Text>
                  )}
                </View>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color="#CBD5E0"
              />
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#FEF7F4" },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#2D3748",
    marginBottom: 20,
    marginTop: 10,
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4A5568",
    marginBottom: 12,
  },
  input: {
    backgroundColor: "#F7FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    color: "#2D3748",
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: "#FF6B6B",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
  subtitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2D3748",
    marginTop: 10,
    marginBottom: 12,
  },
  roomCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  roomCardContent: { flexDirection: "row", alignItems: "center" },
  roomName: { fontSize: 18, fontWeight: "bold", color: "#2D3748" },
  roomRole: { fontSize: 14, color: "#718096", marginTop: 4 },
});
