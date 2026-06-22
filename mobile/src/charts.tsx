import { line as d3Line, area as d3Area } from "d3-shape";
import { useMemo, useState } from "react";
import { LayoutChangeEvent, View, Text, Pressable } from "react-native";
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { colors, font, radius } from "./theme";

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
};

type XYPoint = ChartPoint & {
  x: number;
  y: number;
  index: number;
};

const fallbackPoints: ChartPoint[] = [
  100000, 100420, 100180, 100980, 100640, 101280, 100940, 101760, 102120, 101900, 102620, 102415,
].map((value, index) => ({ value, label: `Point ${index + 1}` }));

export function InteractiveLineChart({
  points,
  height = 260,
  color = colors.accent,
  negative = false,
  baseline,
  formatValue = (value) => String(Math.round(value)),
  compareEnabled = false,
  onCompareChange,
}: InteractiveLineChartProps) {
  const [width, setWidth] = useState(340);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [compareStart, setCompareStart] = useState(1);
  const [compareEnd, setCompareEnd] = useState(Math.max(1, (points.length || fallbackPoints.length) - 2));
  const source = points.length > 1 ? points : fallbackPoints;
  const stroke = negative ? colors.red : color;
  const padX = 18;
  const padTop = 14;
  const padBottom = 24;
  const chartHeight = height - padTop - padBottom;

  const computed = useMemo(() => {
    const values = source.map((point) => Number(point.value)).filter(Number.isFinite);
    const min = Math.min(...values, baseline ?? values[0]);
    const max = Math.max(...values, baseline ?? values[0]);
    const spread = Math.max(max - min, 1);
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

  function onLayout(event: LayoutChangeEvent) {
    setWidth(Math.max(280, event.nativeEvent.layout.width));
  }

  function indexFromX(x: number) {
    const ratio = Math.max(0, Math.min(1, (x - padX) / Math.max(width - padX * 2, 1)));
    return Math.round(ratio * (source.length - 1));
  }

  function handleTouch(x: number) {
    const nextIndex = indexFromX(x);
    setSelectedIndex(nextIndex);
    if (compareEnabled) {
      const startDistance = Math.abs(nextIndex - compareStart);
      const endDistance = Math.abs(nextIndex - compareEnd);
      if (startDistance <= endDistance) setCompareStart(nextIndex);
      else setCompareEnd(nextIndex);
    }
  }

  const selected = computed.xy[selectedIndex ?? Math.min(5, computed.xy.length - 1)];
  const start = computed.xy[Math.min(compareStart, compareEnd)];
  const end = computed.xy[Math.max(compareStart, compareEnd)];
  const compareDelta = start && end ? end.value - start.value : 0;
  const comparePct = start?.value ? (compareDelta / start.value) * 100 : 0;

  return (
    <View onLayout={onLayout} style={{ gap: 10 }}>
      <View
        style={{ height, width: "100%" }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(event) => handleTouch(event.nativeEvent.locationX)}
        onResponderMove={(event) => handleTouch(event.nativeEvent.locationX)}
      >
        <Svg width="100%" height={height}>
          <Defs>
            <LinearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={stroke} stopOpacity={0.28} />
              <Stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
            </LinearGradient>
          </Defs>
          <Path d={computed.pathArea} fill="url(#chartFill)" />
          {computed.baselineY != null ? (
            <Line x1={padX} x2={width - padX} y1={computed.baselineY} y2={computed.baselineY} stroke="rgba(255,255,255,0.22)" strokeDasharray="5 9" strokeWidth={1} />
          ) : null}
          {compareEnabled && start && end ? (
            <>
              <Rect x={start.x} y={padTop} width={Math.max(end.x - start.x, 2)} height={chartHeight} fill={colors.accentSoft} />
              <Line x1={start.x} x2={start.x} y1={padTop} y2={height - padBottom} stroke={colors.accent} strokeOpacity={0.5} />
              <Line x1={end.x} x2={end.x} y1={padTop} y2={height - padBottom} stroke={colors.accent} strokeOpacity={0.5} />
              <Circle cx={start.x} cy={start.y} r={6} fill={colors.bg} stroke={stroke} strokeWidth={4} />
              <Circle cx={end.x} cy={end.y} r={6} fill={colors.bg} stroke={stroke} strokeWidth={4} />
            </>
          ) : null}
          <Path d={computed.pathLine} fill="none" stroke={stroke} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
          {selected ? (
            <>
              <Line x1={selected.x} x2={selected.x} y1={padTop} y2={height - padBottom} stroke={stroke} strokeOpacity={0.45} />
              <Circle cx={selected.x} cy={selected.y} r={7} fill={colors.bg} stroke={stroke} strokeWidth={4} />
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
              padding: 12,
              borderRadius: radius.md,
              backgroundColor: "rgba(14,18,16,0.94)",
            }}
          >
            <Text style={{ color: colors.muted, fontSize: 12 }}>{selected.label ?? `Point ${selected.index + 1}`}</Text>
            <Text style={{ marginTop: 4, color: colors.text, fontSize: 18, fontWeight: font.bold, fontVariant: ["tabular-nums"] }}>{formatValue(selected.value)}</Text>
          </View>
        ) : null}
      </View>

      <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
        <Pressable
          onPress={() => onCompareChange?.(!compareEnabled)}
          style={{
            minHeight: 46,
            paddingHorizontal: 20,
            borderRadius: radius.pill,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: compareEnabled ? colors.accent : colors.panelAlt,
          }}
        >
          <Text style={{ color: compareEnabled ? "#00170f" : colors.text, fontSize: 13, fontWeight: font.bold }}>
            {compareEnabled ? `${formatValue(Math.abs(compareDelta))} / ${comparePct >= 0 ? "+" : "-"}${Math.abs(comparePct).toFixed(2)}%` : "Compare"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
