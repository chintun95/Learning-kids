import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform } from "react-native";

export default function ParentTabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#FFFFFF",
        tabBarInactiveTintColor: "#000",
        tabBarStyle: {
          backgroundColor: "#93DEFF",
          borderTopWidth: 0,
          height:
            Platform.OS === "android"
              ? 60 + (insets.bottom > 0 ? insets.bottom : 8)
              : 60 + insets.bottom,
          paddingBottom:
            Platform.OS === "android"
              ? insets.bottom > 0
                ? insets.bottom
                : 8
              : insets.bottom,
          paddingTop: 5,
          elevation: 0, // removes Android shadow
          shadowOpacity: 0, // removes iOS shadow
        },
        tabBarLabelStyle: {
          fontFamily: "Fredoka-Medium",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
