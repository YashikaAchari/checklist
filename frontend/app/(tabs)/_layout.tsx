import { Tabs } from "expo-router";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { palette } from "../../src/theme";
import { useAppTheme } from "../../src/themeContext";

export default function TabsLayout() {
  const { theme: t } = useAppTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: t.textSecondary,
        tabBarStyle: {
          backgroundColor: t.surface,
          borderTopColor: t.border,
          borderTopWidth: 0.5,
          height: 64,
          paddingTop: 8,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color, size }) => <Feather name="archive" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="maintenance"
        options={{
          title: "Maintenance",
          tabBarIcon: ({ color, size }) => <Feather name="tool" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="fleet-map"
        options={{
          title: "Fleet",
          tabBarIcon: ({ color, size }) => <Feather name="map" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
