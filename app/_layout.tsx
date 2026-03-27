import { Stack } from "expo-router";

export default function Layout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen
        name="rooms"
        options={{
          title: "ห้องครอบครัวของคุณ",
          headerBackVisible: false,
          headerLeft: () => null,
        }}
      />
      <Stack.Screen name="[roomId]" options={{ title: "รายการซื้อของ" }} />
      <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
      <Stack.Screen name="reset-password" options={{ headerShown: false }} />
    </Stack>
  );
}
