import { Feather } from "@expo/vector-icons";
import { Animated, Pressable, Text, useWindowDimensions, View } from "react-native";
import { colors, font, layoutBreakpoints, navHeight, radius, space, tabletNavWidth } from "./theme";
import type { Tab } from "./types";

const navItems: Array<{ key: Tab; icon: keyof typeof Feather.glyphMap; label: string }> = [
  { key: "portfolio", icon: "home", label: "Home" },
  { key: "discover", icon: "bar-chart-2", label: "Markets" },
  { key: "compete", icon: "award", label: "Compete" },
  { key: "profile", icon: "user", label: "Profile" },
];

export function BottomNav({
  tab,
  setTab,
}: {
  tab: Tab;
  setTab: (tab: Tab) => void;
  tucked?: boolean;
  animatedX?: Animated.Value;
}) {
  const { width } = useWindowDimensions();
  const isTablet = width >= layoutBreakpoints.regular;

  if (isTablet) {
    return (
      <View
        accessibilityRole="tablist"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: tabletNavWidth,
          alignItems: "center",
          paddingTop: space.x8,
          paddingBottom: space.x6,
          backgroundColor: colors.surface,
          borderRightWidth: 1,
          borderRightColor: colors.border,
        }}
      >
        <View accessibilityLabel="PaperAI Trader" style={{ width: 44, height: 44, borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: colors.textPrimary }}>
          <Feather name="trending-up" size={20} color={colors.textInverse} />
        </View>
        <View style={{ flex: 1, justifyContent: "center", gap: space.x3 }}>
          {navItems.map((item) => <NavItem key={item.key} item={item} active={tab === item.key} onPress={() => setTab(item.key)} tablet />)}
        </View>
        <View style={{ alignItems: "center", gap: space.x2 }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.brand }} />
          <Text style={{ color: colors.textSecondary, fontSize: 9, fontWeight: font.bold, letterSpacing: 1, transform: [{ rotate: "-90deg" }] }}>SIMULATED</Text>
        </View>
      </View>
    );
  }

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: navHeight,
        justifyContent: "flex-end",
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
      }}
    >
      <View
        accessibilityRole="tablist"
        style={{
          minHeight: navHeight,
          backgroundColor: colors.surface,
          paddingHorizontal: space.x2,
          paddingTop: space.x2,
          paddingBottom: space.x3,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {navItems.map((item) => <NavItem key={item.key} item={item} active={tab === item.key} onPress={() => setTab(item.key)} />)}
      </View>
    </View>
  );
}

function NavItem({
  item,
  active,
  onPress,
  tablet,
}: {
  item: (typeof navItems)[number];
  active: boolean;
  onPress: () => void;
  tablet?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: active }}
      testID={`nav-${item.key}`}
      onPress={onPress}
      style={({ pressed }) => ({
        width: tablet ? 68 : 76,
        minHeight: tablet ? 64 : 58,
        borderRadius: radius.md,
        alignItems: "center",
        justifyContent: "center",
        gap: space.x1,
        backgroundColor: active ? colors.surfaceMuted : "transparent",
        borderTopWidth: active && !tablet ? 2 : 0,
        borderTopColor: active ? colors.brand : "transparent",
        opacity: pressed ? 0.7 : 1,
        transform: [{ scale: pressed ? 0.96 : 1 }],
      })}
    >
      <Feather name={item.icon} size={19} color={active ? colors.textPrimary : colors.textTertiary} />
      <Text numberOfLines={1} style={{ color: active ? colors.textPrimary : colors.textSecondary, fontSize: 10, fontWeight: active ? font.bold : font.semibold }}>{item.label}</Text>
    </Pressable>
  );
}
