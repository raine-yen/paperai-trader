import { Feather } from "@expo/vector-icons";
import { Animated, Pressable, Text, View } from "react-native";
import { colors, font, navHeight, radius } from "./theme";
import type { Tab } from "./types";

const navItems: Array<{ key: Tab; icon: keyof typeof Feather.glyphMap; label: string }> = [
  { key: "portfolio", icon: "grid", label: "Portfolio" },
  { key: "discover", icon: "compass", label: "Discover" },
  { key: "compete", icon: "award", label: "Compete" },
  { key: "profile", icon: "user", label: "Profile" },
];

export function BottomNav({
  tab,
  setTab,
  tucked,
  animatedX,
}: {
  tab: Tab;
  setTab: (tab: Tab) => void;
  tucked: boolean;
  animatedX: Animated.Value;
}) {
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: navHeight,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.bg,
        borderTopWidth: 1,
        borderTopColor: "rgba(255,255,255,0.04)",
      }}
    >
      <Animated.View
        style={{
          transform: [{ translateX: animatedX }],
          width: tucked ? 66 : 318,
          height: 66,
          borderRadius: radius.pill,
          backgroundColor: colors.panelAlt,
          padding: 8,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: tucked ? "center" : "space-between",
        }}
      >
        {navItems.map((item) => {
          const active = tab === item.key;
          if (tucked && !active) return null;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              onPress={() => setTab(item.key)}
              style={({ pressed }) => ({
                width: tucked ? 50 : active ? 82 : 50,
                height: 50,
                borderRadius: tucked ? 25 : active ? 22 : 25,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: active ? colors.accent : "transparent",
                opacity: pressed ? 0.78 : 1,
              })}
            >
              <Feather name={item.icon} size={21} color={active ? "#00170f" : colors.muted} />
            </Pressable>
          );
        })}
      </Animated.View>
    </View>
  );
}
