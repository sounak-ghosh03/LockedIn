import React from "react";
import { Tabs } from "expo-router";
import { View, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, tabBar, fontSize } from "../../constants/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const TABS: Array<{
  name: string;
  title: string;
  icon: IoniconName;
  iconFocused: IoniconName;
}> = [
  { name: "index", title: "Home", icon: "home-outline", iconFocused: "home" },
  {
    name: "workout",
    title: "Workout",
    icon: "barbell-outline",
    iconFocused: "barbell",
  },
  {
    name: "progress",
    title: "Progress",
    icon: "trending-up-outline",
    iconFocused: "trending-up",
  },
  {
    name: "nutrition",
    title: "Nutrition",
    icon: "nutrition-outline",
    iconFocused: "nutrition",
  },
  {
    name: "analytics",
    title: "Analytics",
    icon: "stats-chart-outline",
    iconFocused: "stats-chart",
  },
  {
    name: "tasks",
    title: "Tasks",
    icon: "checkbox-outline",
    iconFocused: "checkbox",
  },
];

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: tabBar.height + (Platform.OS === "ios" ? insets.bottom : 0),
          paddingBottom: Platform.OS === "ios" ? insets.bottom : 8,
          paddingTop: 8,
          elevation: 0,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 10,
          marginTop: 2,
        },
        tabBarShowLabel: true,
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color }) => (
              <View style={[styles.iconWrapper, focused && styles.iconActive]}>
                <Ionicons
                  name={focused ? tab.iconFocused : tab.icon}
                  size={tabBar.iconSize}
                  color={color}
                />
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 28,
    borderRadius: 14,
  },
  iconActive: {
    backgroundColor: colors.accentDim,
  },
});
