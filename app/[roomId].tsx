import { supabase } from "@/services/supabase";
import { useLocalSearchParams } from "expo-router";
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
  // รับค่าพร้อมบังคับ Type (หลีกเลี่ยง Type Error)
  const { roomId, roomName, roomCode } = useLocalSearchParams<{
    roomId: string;
    roomName: string;
    roomCode: string;
  }>();

  // 1. ระบุ Type เป็น <any[]>
  const [items, setItems] = useState<any[]>([]);
  const [newItemName, setNewItemName] = useState("");

  useEffect(() => {
    if (roomId) fetchItems(); // เช็คว่ามี roomId ก่อนดึงข้อมูล
  }, [roomId]);

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("grocery_items")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false });

    if (!error && data) setItems(data);
  };

  const handleAddItem = async () => {
    if (!newItemName) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("grocery_items")
      .insert([{ room_id: roomId, name: newItemName, created_by: user.id }]);

    if (!error) {
      setNewItemName("");
      fetchItems();
    }
  };

  // 2. ระบุ Type ให้ id และ currentStatus เพื่อแก้ Error: Implicit 'any'
  const toggleBoughtStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("grocery_items")
      .update({ is_bought: !currentStatus })
      .eq("id", id);
    if (!error) fetchItems();
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerInfo}>
        <Text style={styles.title}>ห้อง: {roomName}</Text>
        <Text>ส่งรหัสนี้ให้เพื่อนเข้าห้อง: {roomCode}</Text>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="ชื่อของที่ต้องซื้อ..."
          value={newItemName}
          onChangeText={setNewItemName}
        />
        <Button title="เพิ่มรายการ" onPress={handleAddItem} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id.toString()} // แปลงเป็น String กัน Error
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <View style={{ flex: 1 }}>
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
