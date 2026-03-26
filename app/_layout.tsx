import { Stack } from "expo-router";

export default function Layout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen name="rooms" options={{ title: "ห้องครอบครัวของคุณ" }} />
      <Stack.Screen name="[roomId]" options={{ title: "รายการซื้อของ" }} />
    </Stack>
  );
}
