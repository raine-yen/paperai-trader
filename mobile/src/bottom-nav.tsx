import { Feather } from "@expo/vector-icons";
import { Animated, Pressable, Text, useWindowDimensions, View } from "react-native";
import { colors, font, layoutBreakpoints, navHeight, radius, space, tabletNavWidth } from "./theme";
import type { Tab } from "./types";

const navItems: Array<{ key: Tab; icon: keyof typeof Feather.glyphMap; label: string }> = [
  { key: "portfolio", icon: "pie-chart", label: "Portfolio" },
  { key: "discover", icon: "search", label: "Discover" },
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
          paddingTop: 54,
          paddingBottom: 28,
          backgroundColor: colors.surface,
          borderRightWidth: 1,
          borderRightColor: colors.border,
        }}
      >
        <View accessibilityLabel="PaperAI Trader" style={{ width: 48, height: 48, borderRadius: radius.lg, alignItems: "center", justifyContent: "center", backgroundColor: colors.brand }}>
          <Feather name="trending-up" size={22} color={colors.onBrand} />
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
        paddingHorizontal: space.x4,
        paddingBottom: space.x4,
        backgroundColor: colors.background,
      }}
    >
      <View accessibilityLabel="Paper trading, simulated money only" style={{ height: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.x1 }}>
        <View style={{ width: 6, height: 6, borderRadius: radius.pill, backgroundColor: colors.brand }} />
        <Text style={{ color: colors.textSecondary, fontSize: 9, fontWeight: font.bold, letterSpacing: 1 }}>PAPER · SIMULATED</Text>
      </View>
      <View
        accessibilityRole="tablist"
        style={{
          minHeight: 68,
          borderRadius: radius.xl,
          backgroundColor: colors.surfaceElevated,
          borderWidth: 1,
          borderColor: colors.borderStrong,
          padding: space.x2,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.24,
          shadowRadius: 24,
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
        width: tablet ? 72 : active ? 96 : 60,
        minHeight: tablet ? 68 : 52,
        borderRadius: radius.lg,
        alignItems: "center",
        justifyContent: "center",
        gap: space.x1,
        backgroundColor: active ? colors.brandSoft : "transparent",
        borderWidth: active ? 1 : 0,
        borderColor: active ? colors.borderStrong : "transparent",
        opacity: pressed ? 0.7 : 1,
        transform: [{ scale: pressed ? 0.96 : 1 }],
      })}
    >
      <Feather name={item.icon} size={20} color={active ? colors.brand : colors.textSecondary} />
      <Text numberOfLines={1} style={{ color: active ? colors.brand : colors.textSecondary, fontSize: 10, fontWeight: active ? font.bold : font.semibold }}>{item.label}</Text>
    </Pressable>
  );
}
