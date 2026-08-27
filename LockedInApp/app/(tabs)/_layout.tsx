import React, { useRef, useCallback } from "react";
import { Tabs } from "expo-router";
import { View, StyleSheet, Platform, Animated, ColorValue } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
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
    name: "timer",
    title: "Timer",
    icon: "timer-outline",
    iconFocused: "timer",
  },
  {
    name: "tasks",
    title: "Tasks",
    icon: "checkbox-outline",
    iconFocused: "checkbox",
  },
];

// ─── Animated tab icon ────────────────────────────────────────────────────────

function AnimatedTabIcon({
  focused,
  name,
  color,
}: {
  focused: boolean;
  name: IoniconName;
  color: string | ColorValue;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (focused) {
      Animated.spring(scale, {
        toValue: 1.18,
        useNativeDriver: true,
        speed: 40,
        bounciness: 6,
      }).start();
    } else {
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 40,
        bounciness: 4,
      }).start();
    }
  }, [focused, scale]);

  return (
    <Animated.View
      style={[
        styles.iconWrapper,
        focused && styles.iconActive,
        { transform: [{ scale }] },
      ]}
    >
      <Ionicons name={name} size={tabBar.iconSize} color={color} />
    </Animated.View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  const handleTabPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "rgba(26, 26, 26, 0.96)",
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
          fontSize: 11,
          marginTop: 1,
        },
        tabBarShowLabel: true,
      }}
      screenListeners={{
        tabPress: handleTabPress,
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color }) => (
              <AnimatedTabIcon
                focused={focused}
                name={focused ? tab.iconFocused : tab.icon}
                color={color}
              />
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
    borderTopWidth: 2,
    borderTopColor: colors.accent,
  },
});
