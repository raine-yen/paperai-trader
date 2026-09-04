import { Feather } from "@expo/vector-icons";
import { useEffect, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleProp,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { pct, signedPct, usd } from "./format";
import { getStockBrand, logoUrl } from "./market-data";
import { colors, font, radius, space, typeScale } from "./theme";
import type { Position, Quote } from "./types";

type ButtonVariant = "primary" | "secondary" | "danger" | "quiet";

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  disabledReason,
  loading,
  icon,
  style,
  testID,
  accessibilityHint,
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  disabledReason?: string;
  loading?: boolean;
  icon?: keyof typeof Feather.glyphMap;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityHint?: string;
}) {
  const [focused, setFocused] = useState(false);
  const inactive = Boolean(disabled || loading);
  const backgroundColor =
    variant === "primary"
      ? colors.brand
      : variant === "danger"
        ? colors.bearish
        : variant === "quiet"
          ? "transparent"
          : colors.surfaceMuted;
  const foregroundColor =
    variant === "primary"
      ? colors.onBrand
      : variant === "danger"
        ? colors.textInverse
        : colors.textPrimary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={inactive && disabledReason ? disabledReason : accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: Boolean(loading) }}
      testID={testID}
      onPress={onPress}
      disabled={inactive}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        {
          minHeight: 44,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: space.x2,
          paddingHorizontal: space.x4,
          borderRadius: radius.sm,
          backgroundColor,
          borderWidth: focused || variant === "quiet" ? 2 : 1,
          borderColor: focused ? colors.focusRing : variant === "quiet" ? colors.border : backgroundColor,
          opacity: inactive ? 0.5 : pressed ? 0.78 : 1,
          transform: [{ scale: pressed && !inactive ? 0.99 : 1 }],
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={foregroundColor} /> : null}
      {!loading && icon ? <Feather name={icon} size={17} color={foregroundColor} /> : null}
      <Text style={{ color: foregroundColor, fontSize: typeScale.body, fontWeight: font.bold }}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  active,
  danger,
  disabled,
  testID,
  accessibilityHint,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress?: () => void;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  testID?: string;
  accessibilityHint?: string;
}) {
  const [focused, setFocused] = useState(false);
  const backgroundColor = active ? colors.brand : danger ? colors.bearishSoft : colors.surfaceMuted;
  const foregroundColor = active ? colors.onBrand : danger ? colors.bearish : colors.textPrimary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected: Boolean(active), disabled: Boolean(disabled) }}
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: radius.md,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor,
        borderWidth: focused ? 2 : 1,
        borderColor: focused ? colors.focusRing : active ? colors.brand : colors.border,
        opacity: disabled ? 0.45 : pressed ? 0.72 : 1,
        transform: [{ scale: pressed && !disabled ? 0.96 : 1 }],
      })}
    >
      <Feather name={icon} size={20} color={foregroundColor} />
    </Pressable>
  );
}

export function Input({ label, helper, error, ...props }: TextInputProps & { label?: string; helper?: string; error?: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: space.x2 }}>
      {label ? <Text style={labelStyle()}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textTertiary}
        accessibilityLabel={props.accessibilityLabel ?? label}
        accessibilityHint={props.accessibilityHint ?? helper}
        {...props}
        onFocus={(event) => {
          setFocused(true);
          props.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          props.onBlur?.(event);
        }}
        style={[
          {
            minHeight: 44,
            borderRadius: radius.sm,
            backgroundColor: colors.background,
            color: colors.textPrimary,
            borderWidth: focused || error ? 2 : 1,
            borderColor: error ? colors.error : focused ? colors.focusRing : colors.border,
            paddingHorizontal: space.x3,
            fontSize: 15,
          },
          props.style,
        ]}
      />
      {error || helper ? (
        <Text accessibilityLiveRegion={error ? "polite" : "none"} style={{ color: error ? colors.error : colors.textSecondary, fontSize: typeScale.caption, lineHeight: 18 }}>
          {error ?? helper}
        </Text>
      ) : null}
    </View>
  );
}

export function Section({ title, eyebrow, action, children, testID, style }: { title?: string; eyebrow?: string; action?: ReactNode; children: ReactNode; testID?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ gap: space.x3 }, style]} testID={testID}>
      {title ? (
        <View style={{ minHeight: 32, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.x3 }}>
          <View style={{ flex: 1, gap: space.x1 }}>
            {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
            <Text style={{ color: colors.textPrimary, fontSize: typeScale.title, fontWeight: font.bold }}>{title}</Text>
          </View>
          {action}
        </View>
      ) : null}
      <View>{children}</View>
    </View>
  );
}

export function Surface({
  children,
  padded = true,
  tone,
  elevated,
  style,
  testID,
}: {
  children: ReactNode;
  padded?: boolean;
  tone?: string;
  elevated?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  return (
    <View
      testID={testID}
      style={[
        {
          borderRadius: radius.sm,
          backgroundColor: tone ?? (elevated ? colors.surfaceElevated : colors.surface),
          borderTopWidth: 1,
          borderColor: elevated ? colors.borderStrong : colors.border,
          padding: padded ? space.x4 : 0,
          shadowOpacity: 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Row({
  title,
  sub,
  right,
  tone = colors.textPrimary,
  icon,
  onPress,
  testID,
  accessibilityHint,
  compact = false,
}: {
  title: string;
  sub?: string;
  right?: string;
  tone?: string;
  icon?: keyof typeof Feather.glyphMap;
  onPress?: () => void;
  testID?: string;
  accessibilityHint?: string;
  compact?: boolean;
}) {
  const content = (
    <View style={{ minHeight: compact ? 52 : 64, flexDirection: "row", alignItems: "center", gap: space.x3 }}>
      {icon ? (
        <View style={{ width: 40, height: 40, borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceMuted }}>
          <Feather name={icon} size={18} color={tone} />
        </View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: colors.textPrimary, fontSize: typeScale.body, fontWeight: font.semibold }} numberOfLines={1}>{title}</Text>
        {sub ? <Text style={{ marginTop: compact ? 2 : space.x1, color: colors.textSecondary, fontSize: compact ? 12 : 13 }} numberOfLines={2}>{sub}</Text> : null}
      </View>
      {right ? <Text style={{ color: tone, fontSize: typeScale.body, fontWeight: font.bold, fontVariant: ["tabular-nums"] }}>{right}</Text> : null}
      {onPress ? <Feather name="chevron-right" size={17} color={colors.textTertiary} /> : null}
    </View>
  );
  if (!onPress) return <View testID={testID}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[title, sub, right].filter(Boolean).join(", ")}
      accessibilityHint={accessibilityHint}
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}
    >
      {content}
    </Pressable>
  );
}

export function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.divider }} />;
}

export function Segment<T extends string>({
  value,
  options,
  onChange,
  testID,
}: {
  value: T;
  options: ReadonlyArray<readonly [T, string]>;
  onChange: (value: T) => void;
  testID?: string;
}) {
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: "row", gap: space.x1, padding: space.x1, borderRadius: radius.md, backgroundColor: colors.surfaceMuted }}>
      {options.map(([key, label]) => {
        const active = value === key;
        return (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: active }}
            testID={testID ? `${testID}-${key}` : undefined}
            onPress={() => onChange(key)}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 44,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: radius.sm,
              backgroundColor: active ? colors.surface : "transparent",
              borderWidth: active ? 1 : 0,
              borderColor: active ? colors.border : "transparent",
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Text style={{ color: active ? colors.textPrimary : colors.textSecondary, fontWeight: font.bold }}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function StockLogo({ symbol, size = 40 }: { symbol: string; size?: number }) {
  const brand = getStockBrand(symbol);
  const uri = process.env.EXPO_PUBLIC_APP_STORE_PREVIEW === "1" ? null : logoUrl(symbol);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [symbol, uri]);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: brand.color, alignItems: "center", justifyContent: "center", overflow: "hidden", borderWidth: 1, borderColor: colors.border }}>
      {uri && !failed ? (
        <Image source={{ uri }} onError={() => setFailed(true)} style={{ width: size, height: size }} accessibilityIgnoresInvertColors />
      ) : (
        <Text style={{ color: "#FFFFFF", fontSize: Math.max(11, size * 0.28), fontWeight: font.bold, textShadowColor: "rgba(0,0,0,0.34)", textShadowRadius: 4 }}>{symbol.slice(0, 2)}</Text>
      )}
    </View>
  );
}

export function Avatar({ uri, name, size = 48 }: { uri?: string | null; name: string; size?: number }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "PT";
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center", overflow: "hidden", borderWidth: 1, borderColor: colors.borderStrong }}>
      {uri && !failed ? <Image source={{ uri }} onError={() => setFailed(true)} style={{ width: size, height: size }} /> : <Text style={{ color: colors.brand, fontSize: Math.max(13, size * 0.28), fontWeight: font.bold }}>{initials}</Text>}
    </View>
  );
}

export function MarketRow({
  symbol,
  quote,
  position,
  onPress,
  testID,
}: {
  symbol: string;
  quote?: Quote | null;
  position?: Position | null;
  onPress?: () => void;
  testID?: string;
}) {
  const changePct = quote?.changePercent ?? (quote?.prevClose ? ((quote.price - quote.prevClose) / quote.prevClose) * 100 : null);
  const up = changePct == null || changePct >= 0;
  const accessibleChange = changePct == null ? "change unavailable" : `${Math.abs(changePct).toFixed(2)} percent ${up ? "up" : "down"}`;
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${symbol}, ${quote?.name ?? getStockBrand(symbol).name}, ${quote ? usd(quote.price) : "price unavailable"}, ${accessibleChange}${position ? `, ${Number(position.qty).toFixed(4)} shares owned` : ""}`}
      accessibilityHint={onPress ? `Open ${symbol} research and paper trading` : undefined}
      testID={testID ?? `ticker-${symbol}`}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}
    >
      <View style={{ minHeight: 68, flexDirection: "row", alignItems: "center", gap: space.x3 }}>
        <StockLogo symbol={symbol} size={40} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: space.x2 }}>
            <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: font.bold }}>{symbol}</Text>
            <Text style={{ flex: 1, color: colors.textSecondary, fontSize: 13 }} numberOfLines={1}>{quote?.name ?? getStockBrand(symbol).name}</Text>
          </View>
          <Text style={{ marginTop: space.x1, color: colors.textSecondary, fontSize: typeScale.caption }} numberOfLines={1}>
            {position ? `${Number(position.qty).toFixed(4)} shares · ${usd(position.market_value, 0)}` : "Research before you practice"}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end", minWidth: 98 }}>
          <Text style={{ color: colors.textPrimary, fontSize: typeScale.bodyLarge, fontWeight: font.bold, fontVariant: ["tabular-nums"] }}>{quote ? usd(quote.price) : "—"}</Text>
          <Text style={{ marginTop: space.x1, color: up ? colors.bullish : colors.bearish, fontSize: 14, fontWeight: font.bold, fontVariant: ["tabular-nums"] }}>
            {changePct == null ? pct(null) : `${up ? "▲" : "▼"} ${signedPct(changePct)}`}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export function Metric({ label, value, tone = colors.textPrimary, testID }: { label: string; value: string; tone?: string; testID?: string }) {
  return (
    <View style={{ flex: 1, gap: space.x2 }} testID={testID}>
      <Text style={labelStyle()}>{label}</Text>
      <Text adjustsFontSizeToFit minimumFontScale={0.72} style={{ color: tone, fontSize: 21, fontWeight: font.bold, fontVariant: ["tabular-nums"] }} numberOfLines={1}>{value}</Text>
    </View>
  );
}

export function PaperBadge({ compact }: { compact?: boolean }) {
  return (
    <View accessibilityLabel="Paper trading, simulated money only" style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: space.x2, minHeight: compact ? 24 : 28, paddingHorizontal: compact ? space.x2 : space.x3, borderRadius: radius.sm, backgroundColor: colors.brandSoft }}>
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.brand }} />
      <Text style={{ color: colors.brand, fontSize: compact ? 9 : 11, fontWeight: font.bold, letterSpacing: 1.1 }}>{compact ? "SIMULATED" : "PAPER · SIMULATED"}</Text>
    </View>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <Text style={{ color: colors.warning, fontSize: 10, fontWeight: font.bold, letterSpacing: 1.35, textTransform: "uppercase" }}>{children}</Text>;
}

export function TrendPill({ value, label }: { value: number; label?: string }) {
  const positive = value >= 0;
  return (
    <View accessibilityLabel={`${positive ? "Gain" : "Loss"}, ${signedPct(value)}${label ? `, ${label}` : ""}`} style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: space.x1, minHeight: 28, paddingHorizontal: space.x2, borderRadius: radius.pill, backgroundColor: positive ? colors.bullishSoft : colors.bearishSoft }}>
      <Feather name={positive ? "trending-up" : "trending-down"} size={14} color={positive ? colors.bullish : colors.bearish} />
      <Text style={{ color: positive ? colors.bullish : colors.bearish, fontSize: 13, fontWeight: font.bold, fontVariant: ["tabular-nums"] }}>{signedPct(value)}{label ? ` ${label}` : ""}</Text>
    </View>
  );
}

export function InlineNotice({
  title,
  body,
  tone = "info",
  testID,
}: {
  title: string;
  body?: string;
  tone?: "info" | "success" | "warning" | "error";
  testID?: string;
}) {
  const color = tone === "success" ? colors.success : tone === "warning" ? colors.warning : tone === "error" ? colors.error : colors.info;
  const icon: keyof typeof Feather.glyphMap = tone === "success" ? "check-circle" : tone === "warning" ? "alert-triangle" : tone === "error" ? "alert-circle" : "info";
  return (
    <View accessibilityRole={tone === "error" ? "alert" : "summary"} accessibilityLiveRegion="polite" testID={testID} style={{ flexDirection: "row", gap: space.x3, padding: space.x4, borderRadius: radius.md, backgroundColor: colors.surfaceMuted, borderLeftWidth: 3, borderLeftColor: color }}>
      <Feather name={icon} size={18} color={color} />
      <View style={{ flex: 1, gap: space.x1 }}>
        <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: font.bold }}>{title}</Text>
        {body ? <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 19 }}>{body}</Text> : null}
      </View>
    </View>
  );
}

export function StatePanel({
  icon = "inbox",
  title,
  body,
  actionLabel,
  onAction,
  compact,
  testID,
}: {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
  testID?: string;
}) {
  return (
    <Surface testID={testID}>
      <View style={{ minHeight: compact ? 112 : 220, alignItems: "center", justifyContent: "center", gap: space.x3, paddingVertical: space.x4 }}>
        <View style={{ width: 48, height: 48, borderRadius: radius.lg, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
          <Feather name={icon} size={22} color={colors.brand} />
        </View>
        <View style={{ alignItems: "center", gap: space.x2 }}>
          <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: font.bold }}>{title}</Text>
          <Text style={{ maxWidth: 360, color: colors.textSecondary, fontSize: 14, lineHeight: 21, textAlign: "center" }}>{body}</Text>
        </View>
        {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} variant="secondary" /> : null}
      </View>
    </Surface>
  );
}

export function SkeletonBlock({ height, width = "100%", radiusValue = radius.md }: { height: number; width?: number | `${number}%`; radiusValue?: number }) {
  return <View accessibilityLabel="Loading" style={{ width, height, borderRadius: radiusValue, backgroundColor: colors.surfaceMuted, opacity: 0.72 }} />;
}

const labelStyle = () => ({
  color: colors.textSecondary,
  fontSize: typeScale.caption,
  fontWeight: font.semibold,
  letterSpacing: 0.25,
});
