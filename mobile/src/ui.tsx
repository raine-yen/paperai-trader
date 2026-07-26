import { Feather } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Image, Pressable, StyleProp, Text, TextInput, TextInputProps, View, ViewStyle } from "react-native";
import { colors, font, radius } from "./theme";
import { getStockBrand, logoUrl } from "./market-data";
import { pct, signedPct, usd } from "./format";
import type { Position, Quote } from "./types";

type ButtonVariant = "primary" | "secondary" | "danger" | "quiet";

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  icon,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  icon?: keyof typeof Feather.glyphMap;
  style?: StyleProp<ViewStyle>;
}) {
  const bg = variant === "primary" ? colors.accent : variant === "danger" ? colors.red : variant === "quiet" ? "transparent" : colors.panelAlt;
  const fg = variant === "primary" ? "#00170f" : variant === "danger" ? "#fff" : colors.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          minHeight: 52,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          paddingHorizontal: 18,
          borderRadius: radius.pill,
          backgroundColor: bg,
          opacity: disabled ? 0.45 : pressed ? 0.82 : 1,
        },
        style,
      ]}
    >
      {icon ? <Feather name={icon} size={17} color={fg} /> : null}
      <Text style={{ color: fg, fontSize: 15, fontWeight: font.bold }}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  active,
  danger,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress?: () => void;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: active ? colors.accent : danger ? colors.redSoft : colors.panelAlt,
        opacity: pressed ? 0.78 : 1,
      })}
    >
      <Feather name={icon} size={20} color={active ? "#00170f" : danger ? colors.red : colors.text} />
    </Pressable>
  );
}

export function Input(props: TextInputProps & { label?: string }) {
  return (
    <View style={{ gap: 8 }}>
      {props.label ? <Text style={labelStyle()}>{props.label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.subtle}
        {...props}
        style={[
          {
            minHeight: 54,
            borderRadius: radius.md,
            backgroundColor: colors.panelAlt,
            color: colors.text,
            paddingHorizontal: 16,
            fontSize: 16,
          },
          props.style,
        ]}
      />
    </View>
  );
}

export function Section({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <View style={{ gap: 12 }}>
      {title ? (
        <View style={{ minHeight: 28, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: colors.text, fontSize: 21, fontWeight: font.bold }}>{title}</Text>
          {action}
        </View>
      ) : null}
      <View>{children}</View>
    </View>
  );
}

export function Surface({ children, padded = true, tone }: { children: ReactNode; padded?: boolean; tone?: string }) {
  return (
    <View
      style={{
        borderRadius: radius.lg,
        backgroundColor: tone ?? colors.card,
        borderWidth: 1,
        borderColor: colors.line,
        padding: padded ? 16 : 0,
      }}
    >
      {children}
    </View>
  );
}

export function Row({
  title,
  sub,
  right,
  tone = colors.text,
  icon,
  onPress,
}: {
  title: string;
  sub?: string;
  right?: string;
  tone?: string;
  icon?: keyof typeof Feather.glyphMap;
  onPress?: () => void;
}) {
  const content = (
    <View style={{ minHeight: 60, flexDirection: "row", alignItems: "center", gap: 12 }}>
      {icon ? (
        <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: colors.panelAlt }}>
          <Feather name={icon} size={18} color={tone} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: font.bold }} numberOfLines={1}>{title}</Text>
        {sub ? <Text style={{ marginTop: 3, color: colors.muted, fontSize: 13 }} numberOfLines={1}>{sub}</Text> : null}
      </View>
      {right ? <Text style={{ color: tone, fontSize: 16, fontWeight: font.bold, fontVariant: ["tabular-nums"] }}>{right}</Text> : null}
    </View>
  );
  if (!onPress) return content;
  return <Pressable onPress={onPress}>{content}</Pressable>;
}

export function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.line }} />;
}

export function Segment<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<[T, string]>;
  onChange: (value: T) => void;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 6, padding: 4, borderRadius: radius.pill, backgroundColor: colors.panelAlt }}>
      {options.map(([key, label]) => {
        const active = value === key;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 44,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: radius.pill,
              backgroundColor: active ? colors.text : "transparent",
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ color: active ? "#050606" : colors.muted, fontWeight: font.bold }}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function StockLogo({ symbol, size = 40 }: { symbol: string; size?: number }) {
  const brand = getStockBrand(symbol);
  const uri = logoUrl(symbol);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: brand.color, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      {uri ? <Image source={{ uri }} style={{ width: size, height: size }} /> : <Text style={{ color: colors.text, fontSize: Math.max(11, size * 0.28), fontWeight: font.bold }}>{symbol.slice(0, 2)}</Text>}
    </View>
  );
}

export function Avatar({ uri, name, size = 48 }: { uri?: string | null; name: string; size?: number }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "PT";
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.panelAlt, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      {uri ? <Image source={{ uri }} style={{ width: size, height: size }} /> : <Text style={{ color: colors.accent, fontSize: Math.max(13, size * 0.28), fontWeight: font.bold }}>{initials}</Text>}
    </View>
  );
}

export function MarketRow({
  symbol,
  quote,
  position,
  onPress,
}: {
  symbol: string;
  quote?: Quote | null;
  position?: Position | null;
  onPress?: () => void;
}) {
  const changePct = quote?.changePercent ?? (quote?.prevClose ? ((quote.price - quote.prevClose) / quote.prevClose) * 100 : null);
  const up = changePct == null || changePct >= 0;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.78 : 1 })}>
      <View style={{ minHeight: 74, flexDirection: "row", alignItems: "center", gap: 14 }}>
        <StockLogo symbol={symbol} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
            <Text style={{ color: colors.text, fontSize: 19, fontWeight: font.bold }}>{symbol}</Text>
            <Text style={{ color: colors.muted, fontSize: 13 }} numberOfLines={1}>{quote?.name ?? getStockBrand(symbol).name}</Text>
          </View>
          <Text style={{ marginTop: 4, color: colors.muted, fontSize: 12 }} numberOfLines={1}>
            {position ? `${Number(position.qty).toFixed(4)} shares` : "Not owned"}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end", minWidth: 96 }}>
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: font.bold, fontVariant: ["tabular-nums"] }}>{quote ? usd(quote.price) : "--"}</Text>
          <Text style={{ marginTop: 6, color: up ? colors.accent : colors.red, fontSize: 15, fontWeight: font.bold, fontVariant: ["tabular-nums"] }}>
            {changePct == null ? pct(0) : signedPct(changePct)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export function Metric({ label, value, tone = colors.text }: { label: string; value: string; tone?: string }) {
  return (
    <View style={{ flex: 1, gap: 7 }}>
      <Text style={labelStyle()}>{label}</Text>
      <Text style={{ color: tone, fontSize: 24, fontWeight: font.bold, fontVariant: ["tabular-nums"] }} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const labelStyle = () => ({
  color: colors.muted,
  fontSize: 13,
  fontWeight: font.medium,
});
