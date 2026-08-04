import { area as d3Area, line as d3Line } from "d3-shape";
import { useEffect, useMemo, useRef, useState } from "react";
import { LayoutChangeEvent, Pressable, Text, View } from "react-native";
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { colors, font, radius, space } from "./theme";
import { StatePanel } from "./ui";

type ChartPoint = {
  value: number;
  label?: string;
};

type InteractiveLineChartProps = {
  points: ChartPoint[];
  height?: number;
  color?: string;
  negative?: boolean;
  baseline?: number;
  formatValue?: (value: number) => string;
  compareEnabled?: boolean;
  onCompareChange?: (enabled: boolean) => void;
  emptyTitle?: string;
  emptyBody?: string;
  testID?: string;
  chartLabel?: string;
};

type XYPoint = ChartPoint & {
  x: number;
  y: number;
  index: number;
};

export function InteractiveLineChart({
  points,
  height = 260,
  color = colors.bullish,
  negative = false,
  baseline,
  formatValue = (value) => String(Math.round(value)),
  compareEnabled = false,
  onCompareChange,
  emptyTitle = "Chart unavailable",
  emptyBody = "There is not enough verified market history to draw this range yet.",
  testID,
  chartLabel = "Price",
}: InteractiveLineChartProps) {
  const source = useMemo(() => points.filter((point) => Number.isFinite(Number(point.value))), [points]);
  const [width, setWidth] = useState(340);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [compareStart, setCompareStart] = useState(0);
  const [compareEnd, setCompareEnd] = useState(Math.max(1, source.length - 1));
  const touchOrigin = useRef({ x: 0, y: 0 });
  const touchMoved = useRef(false);
  const stroke = negative ? colors.bearish : color;
  const padX = 18;
  const padTop = 14;
  const padBottom = 24;
  const chartHeight = height - padTop - padBottom;

  const computed = useMemo(() => {
    if (source.length < 2) return { xy: [] as XYPoint[], pathLine: "", pathArea: "", baselineY: null as number | null };
    const values = source.map((point) => Number(point.value));
    const comparison = baseline == null || !Number.isFinite(baseline) ? values[0] : baseline;
    const min = Math.min(...values, comparison);
    const max = Math.max(...values, comparison);
    const spread = Math.max(max - min, Math.abs(max) * 0.002, 1);
    const paddedMin = min - spread * 0.08;
    const paddedMax = max + spread * 0.08;
    const range = Math.max(paddedMax - paddedMin, 1);
    const usableWidth = Math.max(width - padX * 2, 1);
    const xy: XYPoint[] = source.map((point, index) => ({
      ...point,
      index,
      x: padX + (index / Math.max(source.length - 1, 1)) * usableWidth,
      y: padTop + (1 - (point.value - paddedMin) / range) * chartHeight,
    }));
    const pathLine = d3Line<XYPoint>().x((point) => point.x).y((point) => point.y)(xy) ?? "";
    const pathArea = d3Area<XYPoint>()
      .x((point) => point.x)
      .y0(height - padBottom)
      .y1((point) => point.y)(xy) ?? "";
    const baselineY = baseline == null ? null : padTop + (1 - (baseline - paddedMin) / range) * chartHeight;
    return { xy, pathLine, pathArea, baselineY };
  }, [baseline, chartHeight, height, source, width]);

  useEffect(() => {
    const lastIndex = Math.max(0, source.length - 1);
    setSelectedIndex((current) => current == null ? null : Math.min(current, lastIndex));
    setCompareStart((current) => Math.min(current, lastIndex));
    setCompareEnd((current) => Math.min(Math.max(current, source.length > 1 ? 1 : 0), lastIndex));
  }, [source.length]);

  if (source.length < 2) {
    return <StatePanel compact icon="bar-chart-2" title={emptyTitle} body={emptyBody} testID={testID} />;
  }

  function onLayout(event: LayoutChangeEvent) {
    setWidth(Math.max(280, event.nativeEvent.layout.width));
  }

  function indexFromX(x: number) {
    const ratio = Math.max(0, Math.min(1, (x - padX) / Math.max(width - padX * 2, 1)));
    return Math.round(ratio * (source.length - 1));
  }

  function selectIndex(nextIndex: number) {
    const bounded = Math.max(0, Math.min(source.length - 1, nextIndex));
    setSelectedIndex(bounded);
    if (compareEnabled) {
      const startDistance = Math.abs(bounded - compareStart);
      const endDistance = Math.abs(bounded - compareEnd);
      if (startDistance <= endDistance) setCompareStart(bounded);
      else setCompareEnd(bounded);
    }
  }

  function handleTouch(x: number) {
    selectIndex(indexFromX(x));
  }

  const selected = computed.xy[selectedIndex ?? computed.xy.length - 1];
  const start = computed.xy[Math.min(compareStart, compareEnd)];
  const end = computed.xy[Math.max(compareStart, compareEnd)];
  const compareDelta = start && end ? end.value - start.value : 0;
  const comparePct = start?.value ? (compareDelta / start.value) * 100 : 0;
  const first = source[0];
  const last = source[source.length - 1];
  const high = Math.max(...source.map((point) => point.value));
  const low = Math.min(...source.map((point) => point.value));
  const summary = `${chartLabel} chart with ${source.length} points. Starts at ${formatValue(first.value)}, ends at ${formatValue(last.value)}, high ${formatValue(high)}, low ${formatValue(low)}. Swipe up or down to inspect points.`;

  return (
    <View onLayout={onLayout} style={{ gap: space.x2 }} testID={testID}>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={summary}
        accessibilityValue={{ text: selected ? `${selected.label ?? `Point ${selected.index + 1}`}, ${formatValue(selected.value)}` : undefined }}
        accessibilityActions={[{ name: "increment", label: "Next chart point" }, { name: "decrement", label: "Previous chart point" }]}
        onAccessibilityAction={(event) => selectIndex((selectedIndex ?? source.length - 1) + (event.nativeEvent.actionName === "increment" ? 1 : -1))}
        style={{ height, width: "100%" }}
        onTouchStart={(event) => {
          touchOrigin.current = { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY };
          touchMoved.current = false;
        }}
        onTouchEnd={(event) => {
          if (!touchMoved.current) handleTouch(event.nativeEvent.locationX);
        }}
        onStartShouldSetResponder={() => false}
        onMoveShouldSetResponder={(event) => {
          const dx = Math.abs(event.nativeEvent.locationX - touchOrigin.current.x);
          const dy = Math.abs(event.nativeEvent.locationY - touchOrigin.current.y);
          touchMoved.current = dx > 8 || dy > 8;
          return dx > 8 && dx > dy;
        }}
        onResponderGrant={(event) => handleTouch(event.nativeEvent.locationX)}
        onResponderMove={(event) => handleTouch(event.nativeEvent.locationX)}
      >
        <Svg width="100%" height={height} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Defs>
            <LinearGradient id="paperChartFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={stroke} stopOpacity={0.25} />
              <Stop offset="100%" stopColor={stroke} stopOpacity={0.015} />
            </LinearGradient>
          </Defs>
          <Path d={computed.pathArea} fill="url(#paperChartFill)" />
          {computed.baselineY != null ? (
            <Line x1={padX} x2={width - padX} y1={computed.baselineY} y2={computed.baselineY} stroke={colors.chartGrid} strokeDasharray="5 9" strokeWidth={1} />
          ) : null}
          {compareEnabled && start && end ? (
            <>
              <Rect x={start.x} y={padTop} width={Math.max(end.x - start.x, 2)} height={chartHeight} fill={colors.brandSoft} opacity={0.75} />
              <Line x1={start.x} x2={start.x} y1={padTop} y2={height - padBottom} stroke={colors.chartCrosshair} />
              <Line x1={end.x} x2={end.x} y1={padTop} y2={height - padBottom} stroke={colors.chartCrosshair} />
              <Circle cx={start.x} cy={start.y} r={6} fill={colors.surface} stroke={stroke} strokeWidth={4} />
              <Circle cx={end.x} cy={end.y} r={6} fill={colors.surface} stroke={stroke} strokeWidth={4} />
            </>
          ) : null}
          <Path d={computed.pathLine} fill="none" stroke={stroke} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
          {selected ? (
            <>
              <Line x1={selected.x} x2={selected.x} y1={padTop} y2={height - padBottom} stroke={colors.chartCrosshair} strokeOpacity={0.72} />
              <Circle cx={selected.x} cy={selected.y} r={7} fill={colors.surface} stroke={stroke} strokeWidth={4} />
            </>
          ) : null}
        </Svg>
        {selected ? (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: Math.min(Math.max(selected.x - 76, 8), width - 164),
              top: Math.max(selected.y - 76, 8),
              width: 156,
              padding: space.x3,
              borderRadius: radius.md,
              backgroundColor: colors.surfaceElevated,
              borderWidth: 1,
              borderColor: colors.borderStrong,
            }}
          >
            <Text style={{ color: colors.textSecondary, fontSize: 12 }} numberOfLines={1}>{selected.label ?? `Point ${selected.index + 1}`}</Text>
            <Text style={{ marginTop: space.x1, color: colors.textPrimary, fontSize: 18, fontWeight: font.bold, fontVariant: ["tabular-nums"] }}>{formatValue(selected.value)}</Text>
          </View>
        ) : null}
      </View>

      {onCompareChange ? (
        <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
          <Pressable
            accessibilityRole="switch"
            accessibilityLabel="Compare chart points"
            accessibilityState={{ checked: compareEnabled }}
            onPress={() => onCompareChange(!compareEnabled)}
            style={({ pressed }) => ({
              minHeight: 44,
              paddingHorizontal: space.x4,
              borderRadius: radius.pill,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: compareEnabled ? colors.brand : colors.surfaceMuted,
              borderWidth: 1,
              borderColor: compareEnabled ? colors.brand : colors.border,
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Text style={{ color: compareEnabled ? colors.onBrand : colors.textPrimary, fontSize: 13, fontWeight: font.bold }}>
              {compareEnabled ? `${formatValue(Math.abs(compareDelta))} · ${comparePct >= 0 ? "+" : "−"}${Math.abs(comparePct).toFixed(2)}%` : "Compare points"}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
