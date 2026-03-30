import { supabase } from "@/services/supabase";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function RoomDetailScreen() {
  const { roomId, roomName, roomCode } = useLocalSearchParams<{
    roomId: string;
    roomName: string;
    roomCode: string;
  }>();

  const [items, setItems] = useState<any[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("");
  const [newItemListType, setNewItemListType] = useState("ประจำสัปดาห์");
  const [filterType, setFilterType] = useState("ทั้งหมด");
  const [priceHistory, setPriceHistory] = useState<Record<string, number[]>>(
    {},
  );

  const [priceModalVisible, setPriceModalVisible] = useState(false);
  const [selectedItemForPrice, setSelectedItemForPrice] = useState<any>(null);
  const [priceInput, setPriceInput] = useState("");

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [roomOwnerId, setRoomOwnerId] = useState<string | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (roomId) {
      fetchInitialData();
      fetchItems();
    }
  }, [roomId]);

  const fetchInitialData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);

    const { data: roomData } = await supabase
      .from("family_rooms")
      .select("creator_id")
      .eq("id", roomId)
      .single();

    if (roomData) {
      setRoomOwnerId(roomData.creator_id);
    }

    fetchMembers();
  };

  const fetchMembers = async () => {
    // ดึงข้อมูลสมาชิก และดึงข้อมูลทุกคอลัมน์ใน profiles (ใช้ *)
    const { data, error } = await supabase
      .from("room_members")
      .select(
        `
        user_id, 
        profiles (*)
      `,
      )
      .eq("room_id", roomId);

    if (!error && data) {
      setMembers(data);
    }
  };

  const isOwner = currentUserId === roomOwnerId;

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("grocery_items")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false });
    if (!error && data) setItems(data);

    // ดึงประวัติราคา
    const { data: historyData, error: historyError } = await supabase
      .from("purchase_history")
      .select("item_name, price")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false });

    if (!historyError && historyData) {
      const historyMap: Record<string, number[]> = {};
      historyData.forEach((h: any) => {
        if (!historyMap[h.item_name]) {
          historyMap[h.item_name] = [];
        }
        historyMap[h.item_name].push(Number(h.price));
      });
      setPriceHistory(historyMap);
    } else if (historyError) {
      console.log("History Query Error:", historyError);
    }
  };

  const getOldPrice = (itemName: string, currentPriceRaw?: any) => {
    const history = priceHistory[itemName];
    if (!history || history.length === 0) return undefined;

    // ถ้ายังไม่ได้ซื้อ (ไม่มี currentPrice) ให้แสดงราคาล่าสุดจากประวัติ
    if (currentPriceRaw == null) return history[0];

    // ถ้ามีประวัติมากกว่า 1 รายการ ให้เทียบกับราคาครั้งก่อนหน้า (index [1])
    // เพราะ index [0] คือราคาที่เพิ่งบันทึกไปล่าสุดในรอบนี้เอง
    if (history.length > 1) {
      return history[1];
    }

    // ถ้ามีแค่ 1 รายการในประวัติ แสดงว่าเป็นการซื้อครั้งแรก
    return undefined;
  };

  const handleAddItem = async () => {
    if (!newItemName || !currentUserId) return;
    const { error } = await supabase.from("grocery_items").insert([
      {
        room_id: roomId,
        name: newItemName,
        created_by: currentUserId,
        quantity: newItemQuantity || null,
        list_type: newItemListType,
      },
    ]);
    if (!error) {
      setNewItemName("");
      setNewItemQuantity("");
      fetchItems();
    }
  };

  const toggleBoughtStatus = async (item: any) => {
    if (!item.is_bought) {
      setSelectedItemForPrice(item);
      setPriceInput("");
      setPriceModalVisible(true);
    } else {
      const { error } = await supabase
        .from("grocery_items")
        .update({ is_bought: false, price: null, bought_by: null })
        .eq("id", item.id);
      if (!error) fetchItems();
    }
  };

  const handleConfirmPrice = async () => {
    if (!selectedItemForPrice) return;
    const priceNum = parseFloat(priceInput);
    if (isNaN(priceNum)) {
      Alert.alert("ข้อผิดพลาด", "กรุณากรอกราคาเป็นตัวเลข");
      return;
    }

    const { error: updateError } = await supabase
      .from("grocery_items")
      .update({ is_bought: true, price: priceNum, bought_by: currentUserId })
      .eq("id", selectedItemForPrice.id);

    if (!updateError) {
      // Add to purchase_history
      await supabase.from("purchase_history").insert([
        {
          room_id: roomId,
          item_name: selectedItemForPrice.name,
          price: priceNum,
        },
      ]);
      setPriceModalVisible(false);
      setSelectedItemForPrice(null);
      fetchItems();
    } else {
      Alert.alert("ข้อผิดพลาด", updateError.message);
    }
  };

  const handleDeleteItem = (id: string) => {
    Alert.alert("ยืนยัน", "ต้องการลบรายการนี้ใช่หรือไม่?", [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ลบ",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from("grocery_items")
            .delete()
            .eq("id", id);
          if (!error) fetchItems();
        },
      },
    ]);
  };

  const handleKickMember = (userIdToKick: string) => {
    Alert.alert("ยืนยัน", "ต้องการเตะสมาชิกคนนี้ออกจากห้อง?", [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "เตะออก",
        style: "destructive",
        onPress: async () => {
          // ใช้ .eq() 2 ตัวต่อกัน เพื่อระบุห้องและผู้ใช้ให้ชัดเจนที่สุด
          const { error } = await supabase
            .from("room_members")
            .delete()
            .eq("room_id", roomId)
            .eq("user_id", userIdToKick);

          if (error) {
            // ถ้าลบไม่ได้ ให้แสดง Error ขึ้นมาบนหน้าจอเลย จะได้รู้ว่าติดอะไร
            Alert.alert("ลบไม่สำเร็จ ❌", error.message);
            console.error("Delete Error:", error);
          } else {
            // ถ้าลบสำเร็จ โหลดรายชื่อใหม่
            fetchMembers();
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerInfo}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>{roomName}</Text>
            <Text style={styles.subtitleDetail}>จัดการรายการซื้อของ</Text>
          </View>
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            style={styles.memberCountBtn}
          >
            <MaterialCommunityIcons
              name="account-group"
              size={20}
              color="#FF6B6B"
            />
            <Text style={styles.memberCountText}>{members.length}</Text>
          </TouchableOpacity>
        </View>
        {isOwner && (
          <View style={styles.codeContainer}>
            <Text style={styles.codeLabel}>รหัสเชิญเพื่อนเข้าห้อง: </Text>
            <Text style={styles.codeText}>{roomCode}</Text>
          </View>
        )}
      </View>

      {/* Input Card */}
      <View style={styles.inputCard}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 15,
          }}
        >
          <Text style={styles.inputCardTitle}>จะซื้ออะไรดี?</Text>
          <TouchableOpacity
            style={styles.addButtonModern}
            onPress={handleAddItem}
          >
            <MaterialCommunityIcons name="plus" size={20} color="#FFF" />
            <Text style={{ color: "#FFF", fontWeight: "bold", marginLeft: 4 }}>
              เพิ่มเลย
            </Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={[styles.inputModern, { marginBottom: 12 }]}
          placeholder="ชื่อสิ่งของ (เช่น น้ำตาล, ไข่ไก่)"
          placeholderTextColor="#A0AEC0"
          value={newItemName}
          onChangeText={setNewItemName}
        />
        <View style={{ flexDirection: "row", gap: 12 }}>
          <TextInput
            style={[styles.inputModern, { flex: 1, fontSize: 15.5 }]}
            placeholder="จำนวน"
            placeholderTextColor="#A0AEC0"
            value={newItemQuantity}
            onChangeText={setNewItemQuantity}
          />
          <TouchableOpacity
            style={styles.listTypeBtnModern}
            onPress={() => {
              const types = ["ประจำสัปดาห์", "ประจำเดือน"];
              const nextIndex =
                (types.indexOf(newItemListType) + 1) % types.length;
              setNewItemListType(types[nextIndex]);
            }}
          >
            <MaterialCommunityIcons
              name={
                newItemListType === "ประจำสัปดาห์"
                  ? "calendar-week"
                  : "calendar-month"
              }
              size={18}
              color="#FF6B6B"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.listTypeTextModern}>{newItemListType}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={{ marginBottom: 16 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            flexDirection: "row",
            gap: 10,
            paddingHorizontal: 2,
            paddingBottom: 4,
          }}
        >
          {["ทั้งหมด", "ประจำสัปดาห์", "ประจำเดือน"].map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterTab,
                filterType === type && styles.filterTabActive,
              ]}
              onPress={() => setFilterType(type)}
            >
              <Text
                style={[
                  styles.filterText,
                  filterType === type && styles.filterTextActive,
                ]}
              >
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* List รายการของ */}
      <FlatList
        data={items.filter(
          (item) => filterType === "ทั้งหมด" || item.list_type === filterType,
        )}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => {
          const currentPriceNum =
            item.price != null ? Number(item.price) : undefined;
          const oldPrice = getOldPrice(
            item.name,
            item.is_bought ? currentPriceNum : undefined,
          );

          let buyerName = "";
          if (item.is_bought && item.bought_by) {
            const buyer = members.find((m) => m.user_id === item.bought_by);
            if (buyer) {
              const profileData = Array.isArray(buyer.profiles)
                ? buyer.profiles[0]
                : buyer.profiles;
              buyerName =
                profileData?.full_name ||
                profileData?.username ||
                profileData?.display_name ||
                "สมาชิก";
              if (item.bought_by === currentUserId) buyerName += " (คุณ)";
            }
          }

          return (
            <View
              style={[styles.itemCard, item.is_bought && styles.itemCardBought]}
            >
              <TouchableOpacity
                style={styles.itemInfo}
                onPress={() => toggleBoughtStatus(item)}
                activeOpacity={0.6}
              >
                <View
                  style={[
                    styles.checkbox,
                    item.is_bought && styles.checkboxActive,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="check"
                    size={18}
                    color={item.is_bought ? "#FFF" : "transparent"}
                  />
                </View>

                <View style={{ marginLeft: 16, flex: 1 }}>
                  <Text
                    style={[
                      styles.itemName,
                      item.is_bought && styles.itemNameBought,
                    ]}
                  >
                    {item.name}{" "}
                    {item.quantity ? (
                      <Text style={styles.itemQuantity}>({item.quantity})</Text>
                    ) : (
                      ""
                    )}
                  </Text>

                  <View style={styles.badgeRow}>
                    {item.list_type && item.list_type !== "ทั่วไป" && (
                      <View style={styles.badgePill}>
                        <Text style={styles.badgeText}>{item.list_type}</Text>
                      </View>
                    )}
                    {item.is_bought && item.price != null && (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <View
                          style={[
                            styles.badgePill,
                            { backgroundColor: "#E6FFFA" },
                          ]}
                        >
                          <Text
                            style={[styles.badgeText, { color: "#319795" }]}
                          >
                            ฿{item.price}
                          </Text>
                        </View>
                        {buyerName ? (
                          <Text
                            style={{
                              fontSize: 12,
                              color: "#718096",
                              fontWeight: "bold",
                            }}
                          >
                            👤 {buyerName}
                          </Text>
                        ) : null}
                      </View>
                    )}
                  </View>

                  {!item.is_bought && oldPrice !== undefined && (
                    <Text style={styles.priceHistoryDetail}>
                      💰 ซื้อครั้งล่าสุด: ฿{oldPrice}
                    </Text>
                  )}

                  {item.is_bought && oldPrice === undefined && (
                    <Text
                      style={[styles.priceHistoryDetail, { color: "#319795" }]}
                    >
                      ✨ ซื้อครั้งแรก บันทึกราคา ฿{item.price} แล้ว
                    </Text>
                  )}

                  {item.is_bought &&
                    oldPrice !== undefined &&
                    oldPrice !== currentPriceNum && (
                      <Text
                        style={[
                          styles.priceDiff,
                          currentPriceNum! > oldPrice
                            ? { color: "#E53E3E" }
                            : { color: "#38A169" },
                        ]}
                      >
                        {currentPriceNum! > oldPrice
                          ? "🔺 แอบแพงขึ้น"
                          : "🔻 ดีจัง! ถูกลง"}{" "}
                        {Math.abs(currentPriceNum! - oldPrice)} บาท
                        (จากครั้งก่อน ฿{oldPrice})
                      </Text>
                    )}
                </View>
              </TouchableOpacity>

              <View style={{ flexDirection: "row" }}>
                {isOwner && (
                  <TouchableOpacity
                    onPress={() => handleDeleteItem(item.id)}
                    style={styles.deleteBtn}
                  >
                    <MaterialCommunityIcons
                      name="trash-can-outline"
                      size={24}
                      color="#E53E3E"
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
      />

      {/* Modal สมาชิก */}
      <Modal visible={modalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>สมาชิกในห้อง</Text>
            <FlatList
              data={members}
              keyExtractor={(item) => item.user_id}
              renderItem={({ item }) => {
                const isThisUserOwner = item.user_id === roomOwnerId;
                const isMe = item.user_id === currentUserId;

                // ดึงข้อมูลชื่อ เผื่อไว้หลายๆ กรณี
                const profileData = Array.isArray(item.profiles)
                  ? item.profiles[0]
                  : item.profiles;
                const displayName =
                  profileData?.full_name ||
                  profileData?.username ||
                  profileData?.display_name ||
                  "ผู้ใช้ไม่ระบุชื่อ";

                return (
                  <View style={styles.memberRow}>
                    <View style={styles.memberInfo}>
                      <MaterialCommunityIcons
                        name="account-circle"
                        size={40}
                        color="#E2E8F0"
                      />
                      <View style={{ marginLeft: 14 }}>
                        <Text style={styles.memberName}>
                          {displayName}
                          {isMe && (
                            <Text style={{ color: "#A0AEC0" }}> (คุณ)</Text>
                          )}
                        </Text>
                        {isThisUserOwner && (
                          <Text style={styles.ownerBadge}>👑 เจ้าของห้อง</Text>
                        )}
                      </View>
                    </View>
                    {isOwner && !isThisUserOwner && (
                      <TouchableOpacity
                        onPress={() => handleKickMember(item.user_id)}
                        style={styles.kickBtn}
                      >
                        <Text style={styles.kickText}>เตะออก</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              }}
            />
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeBtnText}>ปิดหน้าต่าง</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Price Modal */}
      <Modal
        visible={priceModalVisible}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              ระบุราคา ({selectedItemForPrice?.name})
            </Text>
            {priceHistory[selectedItemForPrice?.name]?.[0] !== undefined && (
              <Text
                style={{
                  textAlign: "center",
                  marginBottom: 16,
                  color: "#718096",
                  fontSize: 14,
                }}
              >
                💡 คุณเคยซื้อในราคา: ฿
                {priceHistory[selectedItemForPrice?.name][0]}
              </Text>
            )}
            <TextInput
              style={[
                styles.inputModern,
                { fontSize: 24, textAlign: "center", fontWeight: "bold" },
              ]}
              placeholder="0"
              keyboardType="numeric"
              value={priceInput}
              onChangeText={setPriceInput}
              autoFocus={true}
            />
            <View style={{ flexDirection: "row", gap: 12, marginTop: 24 }}>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  { flex: 1, backgroundColor: "#F1F5F9" },
                ]}
                onPress={() => {
                  setPriceModalVisible(false);
                  setSelectedItemForPrice(null);
                }}
              >
                <Text style={[styles.buttonText, { color: "#475569" }]}>
                  ยกเลิก
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, { flex: 1 }]}
                onPress={handleConfirmPrice}
              >
                <Text style={styles.buttonText}>ยืนยันราคา</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#F8FAFC" },
  headerInfo: {
    backgroundColor: "#FFFFFF",
    padding: 24,
    borderRadius: 24,
    marginBottom: 20,
    shadowColor: "#FF6B6B",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 26, fontWeight: "900", color: "#1A202C" },
  subtitleDetail: {
    fontSize: 14,
    color: "#718096",
    marginTop: 4,
    fontWeight: "500",
  },
  memberCountBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF5F5",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  memberCountText: {
    marginLeft: 6,
    fontWeight: "800",
    color: "#FF6B6B",
    fontSize: 16,
  },
  codeContainer: {
    flexDirection: "row",
    marginTop: 18,
    backgroundColor: "#F7FAFC",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EDF2F7",
  },
  codeLabel: { color: "#718096", fontSize: 14 },
  codeText: {
    fontWeight: "800",
    color: "#FF6B6B",
    fontSize: 16,
    letterSpacing: 2,
  },

  inputCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    marginBottom: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  inputCardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#2D3748",
  },
  addButtonModern: {
    backgroundColor: "#FF6B6B",
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#FF6B6B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  inputModern: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 18,
    fontSize: 16,
    color: "#2D3748",
  },
  listTypeBtnModern: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF5F5",
    paddingHorizontal: 10,
    borderRadius: 18,
    flex: 1,
    borderWidth: 1,
    borderColor: "#FED7D7",
  },
  listTypeTextModern: {
    color: "#E53E3E",
    fontWeight: "bold",
    fontSize: 14,
  },
  filterTab: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  filterTabActive: {
    backgroundColor: "#2D3748",
  },
  filterText: {
    fontSize: 14,
    color: "#A0AEC0",
    fontWeight: "700",
  },
  filterTextActive: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },

  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 20,
    marginBottom: 14,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  itemCardBought: {
    backgroundColor: "#F1F5F9",
    opacity: 0.7,
  },
  itemInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: {
    backgroundColor: "#48BB78",
    borderColor: "#48BB78",
  },
  itemName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1A202C",
  },
  itemNameBought: { textDecorationLine: "line-through", color: "#A0AEC0" },
  itemQuantity: {
    color: "#718096",
    fontSize: 16,
    fontWeight: "600",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    gap: 8,
  },
  badgePill: {
    backgroundColor: "#FEFCBF",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    color: "#B7791F",
    fontWeight: "800",
  },
  priceHistoryDetail: {
    fontSize: 13,
    color: "#718096",
    marginTop: 8,
    fontWeight: "600",
  },
  priceDiff: {
    fontSize: 13,
    fontWeight: "800",
    marginTop: 6,
  },
  deleteBtn: {
    padding: 12,
    backgroundColor: "#FFF5F5",
    borderRadius: 16,
    justifyContent: "center",
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.5)",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    padding: 32,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    minHeight: 200,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1A202C",
    marginBottom: 8,
    textAlign: "center",
  },
  memberRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: "#F1F5F9",
  },
  memberInfo: { flexDirection: "row", alignItems: "center" },
  memberName: { fontSize: 16, fontWeight: "800", color: "#2D3748" },
  ownerBadge: {
    color: "#DD6B20",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
  },
  kickBtn: {
    backgroundColor: "#FFF5F5",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  kickText: { color: "#E53E3E", fontWeight: "800", fontSize: 13 },
  closeBtn: {
    backgroundColor: "#F1F5F9",
    padding: 18,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 24,
  },
  closeBtnText: { color: "#475569", fontWeight: "800", fontSize: 16 },
  primaryButton: {
    backgroundColor: "#FF6B6B",
    padding: 18,
    borderRadius: 18,
    alignItems: "center",
  },
  buttonText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
});
