import { Link, Stack } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { colors, fontSize, spacing } from "../constants/theme";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not Found" }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen doesn't exist.</Text>
        <Link href="/(tabs)" style={styles.link}>
          <Text style={styles.linkText}>Go to home</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing["2xl"],
  },
  title: {
    fontFamily: "Outfit_700Bold",
    fontSize: fontSize.xl,
    color: colors.text,
    textAlign: "center",
  },
  link: { marginTop: spacing.xl },
  linkText: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.base,
    color: colors.accent,
  },
});
