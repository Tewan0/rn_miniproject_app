import { supabase } from "@/services/supabase";
import { useLocalSearchParams } from "expo-router"; // ใช้รับค่าพารามิเตอร์ใน Expo Router
import React, { useEffect, useState } from "react";
import {
  Button,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function RoomDetailScreen() {
  // รับค่า id ของห้อง, ชื่อห้อง, และรหัสเชิญ ที่ส่งมาจากหน้า rooms.js
  const { roomId, roomName, roomCode } = useLocalSearchParams<{
    roomId: string;
    roomName: string;
    roomCode: string;
  }>();

  const [items, setItems] = useState<any[]>([]);
  const [newItemName, setNewItemName] = useState("");

  useEffect(() => {
    fetchItems();
  }, [roomId]);

  // ดึงรายการของเฉพาะที่อยู่ในห้องนี้
  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("grocery_items")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false });

    if (!error && data) setItems(data);
  };

  // เพิ่มของชิ้นใหม่ลงห้อง
  const handleAddItem = async () => {
    if (!newItemName) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // เช็คว่ามี user ก่อน insert
    if (!user) return;

    const { error } = await supabase
      .from("grocery_items")
      .insert([{ room_id: roomId, name: newItemName, created_by: user.id }]);

    if (!error) {
      setNewItemName("");
      fetchItems();
    }
  };

  // อัปเดตสถานะว่า ซื้อแล้ว หรือ ยังไม่ได้ซื้อ
  const toggleBoughtStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("grocery_items")
      .update({ is_bought: !currentStatus })
      .eq("id", id);
    if (!error) fetchItems();
  };

  return (
    <View style={styles.container}>
      {/* ส่วนหัวแสดงข้อมูลห้อง */}
      <View style={styles.headerInfo}>
        <Text style={styles.title}>ห้อง: {roomName}</Text>
        <Text>ส่งรหัสนี้ให้เพื่อนเข้าห้อง: {roomCode}</Text>
      </View>

      {/* ช่องสำหรับกรอกและเพิ่มรายการ */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="ชื่อของที่ต้องซื้อ..."
          value={newItemName}
          onChangeText={setNewItemName}
        />
        <Button title="เพิ่มรายการ" onPress={handleAddItem} />
      </View>

      {/* ลิสต์แสดงรายการของ */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <View style={{ flex: 1 }}>
              {/* ถ้าซื้อแล้วให้ขีดฆ่าชื่อทิ้ง */}
              <Text
                style={[
                  styles.itemName,
                  item.is_bought && {
                    textDecorationLine: "line-through",
                    color: "gray",
                  },
                ]}
              >
                {item.name}
              </Text>
            </View>

            {/* ปุ่มเปลี่ยนสถานะการซื้อ */}
            <TouchableOpacity
              onPress={() => toggleBoughtStatus(item.id, item.is_bought)}
              style={[
                styles.btn,
                item.is_bought ? styles.btnGreen : styles.btnOrange,
              ]}
            >
              <Text style={{ color: "#fff" }}>
                {item.is_bought ? "ซื้อแล้ว" : "ยังไม่ซื้อ"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15 },
  headerInfo: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: "#e3f2fd",
    borderRadius: 8,
  },
  title: { fontSize: 20, fontWeight: "bold" },
  inputContainer: {
    marginBottom: 20,
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
  },
  itemName: { fontSize: 16, fontWeight: "bold" },
  btn: { padding: 8, borderRadius: 5 },
  btnGreen: { backgroundColor: "#4CAF50" },
  btnOrange: { backgroundColor: "#FF9800" },
});
