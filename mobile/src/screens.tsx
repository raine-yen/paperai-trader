import { Feather } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { InteractiveLineChart } from "./charts";
import { compactMoney, compactNumber, cents, firstName, maybeUsd, metric, predictionCategory, predictionEndLabel, probability, rangeLabel, signedPct, signedUsd, timeAgo, usd } from "./format";
import { getCompanyName, MARKET_GROUPS } from "./market-data";
import { colors, font, layoutBreakpoints, navHeight, radius, space, themeOptions, type ThemePreference } from "./theme";
import {
  Avatar,
  Button,
  Divider,
  Eyebrow,
  IconButton,
  InlineNotice,
  Input,
  MarketRow,
  Metric,
  PaperBadge,
  Row,
  Section,
  Segment,
  SkeletonBlock,
  StatePanel,
  StockLogo,
  Surface,
  TrendPill,
} from "./ui";
import type {
  AdminData,
  AmountMode,
  Bar,
  DiscoverView,
  LeaderboardEntry,
  Me,
  Order,
  OrderStage,
  OrderType,
  Position,
  PredictionHistoryPoint,
  PredictionMarket,
  PredictionOutcome,
  PredictionTradeResult,
  PredictionView,
  Quote,
  Side,
} from "./types";

const chartRanges = [
  ["1h", "1H"],
  ["1d", "1D"],
  ["5d", "5D"],
  ["1mo", "1M"],
  ["3mo", "3M"],
  ["1y", "1Y"],
] as const;

export function AuthScreen({
  mode,
  setMode,
  email,
  setEmail,
  password,
  setPassword,
  displayName,
  setDisplayName,
  submit,
  busy,
  error,
}: {
  mode: "login" | "signup";
  setMode: (mode: "login" | "signup") => void;
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  displayName: string;
  setDisplayName: (value: string) => void;
  submit: () => void;
  busy: boolean;
  error: string;
}) {
  const { width } = useWindowDimensions();
  const isTablet = width >= layoutBreakpoints.regular;
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: isTablet ? space.x12 : space.x6, backgroundColor: colors.background }}
    >
      <View style={{ width: "100%", maxWidth: 980, alignSelf: "center", flexDirection: isTablet ? "row" : "column", alignItems: "stretch", gap: isTablet ? space.x12 : space.x8 }}>
        <View style={{ flex: 1.15, justifyContent: "center", gap: space.x6 }}>
          <PaperBadge />
          <View style={{ gap: space.x3 }}>
            <Eyebrow>PaperAI Trader</Eyebrow>
            <Text style={{ color: colors.textPrimary, fontSize: isTablet ? 58 : 42, lineHeight: isTablet ? 62 : 46, fontWeight: font.bold }}>Build skill, not risk.</Text>
            <Text style={{ maxWidth: 520, color: colors.textSecondary, fontSize: 16, lineHeight: 24 }}>
              Research real market data, practice decisions with simulated funds, and learn from every outcome. Nothing here is real-money trading.
            </Text>
          </View>
          {isTablet ? (
            <View style={{ flexDirection: "row", gap: space.x4 }}>
              <MiniPrinciple icon="search" title="Research" body="See the context" />
              <MiniPrinciple icon="shield" title="Practice" body="Review before submit" />
              <MiniPrinciple icon="book-open" title="Reflect" body="Learn from results" />
            </View>
          ) : null}
        </View>
        <Surface elevated style={{ flex: 0.85, alignSelf: "stretch", padding: space.x6 }}>
          <View style={{ gap: space.x4 }}>
            <View style={{ gap: space.x2 }}>
              <Text style={{ color: colors.textPrimary, fontSize: 26, fontWeight: font.bold }}>{mode === "login" ? "Welcome back" : "Create your practice account"}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 21 }}>Use the same account as PaperAI Trader on the web.</Text>
            </View>
            <Segment testID="auth-mode" value={mode} options={[["login", "Sign in"], ["signup", "Create account"]]} onChange={setMode} />
            {mode === "signup" ? <Input testID="auth-display-name" label="Display name" value={displayName} onChangeText={setDisplayName} placeholder="How your club sees you" autoComplete="name" /> : null}
            <Input testID="auth-email" label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="you@example.com" />
            <Input testID="auth-password" label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="Password" />
            {error ? <InlineNotice tone="error" title="Could not continue" body={error} /> : null}
            <Button testID="auth-submit" label={busy ? "Working…" : mode === "login" ? "Sign in" : "Create practice account"} onPress={submit} loading={busy} />
          </View>
        </Surface>
      </View>
    </ScrollView>
  );
}

export function PortfolioScreen({
  me,
  quotes,
  openSymbol,
  goDiscover,
  refreshing,
}: {
  me: Me | null;
  quotes: Record<string, Quote>;
  openSymbol: (symbol: string) => void;
  goDiscover: () => void;
  refreshing: boolean;
}) {
  const { width } = useWindowDimensions();
  const isTablet = width >= layoutBreakpoints.regular;
  const [compare, setCompare] = useState(false);
  const account = me?.account;
  if (!account) {
    return refreshing ? (
      <View accessibilityLabel="Loading portfolio" style={{ gap: space.x4 }}>
        <SkeletonBlock height={42} width="58%" />
        <SkeletonBlock height={isTablet ? 470 : 510} radiusValue={radius.lg} />
        <SkeletonBlock height={220} radiusValue={radius.lg} />
      </View>
    ) : <StatePanel title="No practice account" body="Refresh after signing in or contact your club administrator." icon="alert-circle" />;
  }

  const costBasis = me?.performance?.cost_basis ?? (me?.positions ?? []).reduce((sum, position) => sum + Number(position.qty) * Number(position.avg_entry_price), 0);
  const gain = me?.performance?.gain_amount ?? (me?.positions ?? []).reduce((sum, position) => sum + Number(position.unrealized_pl), 0);
  const gainPct = me?.performance?.growth_pct ?? (costBasis > 0 ? (gain / costBasis) * 100 : 0);
  const snapshots = me?.snapshots ?? [];
  const allocationBase = Math.max(Number(account.cash) + Number(account.positions_value), 1);
  const positionsByValue = [...(me?.positions ?? [])].sort((a, b) => Number(b.market_value) - Number(a.market_value));
  const largestPosition = positionsByValue[0];
  const concentration = largestPosition ? (Number(largestPosition.market_value) / allocationBase) * 100 : 0;
  const largestMover = [...(me?.positions ?? [])].sort((a, b) => Math.abs(Number(b.unrealized_pl)) - Math.abs(Number(a.unrealized_pl)))[0];

  const hero = (
    <Surface elevated style={{ flex: isTablet ? 1.45 : undefined, padding: isTablet ? space.x6 : space.x4 }}>
      <View style={{ gap: space.x4 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: space.x4 }}>
          <View style={{ flex: 1, gap: space.x2 }}>
            <Eyebrow>Portfolio value</Eyebrow>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.62}
              numberOfLines={1}
              style={{ color: colors.textPrimary, fontSize: isTablet ? 56 : 42, lineHeight: isTablet ? 60 : 48, fontWeight: font.semibold, fontVariant: ["tabular-nums"] }}
            >
              {usd(account.equity)}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: space.x2 }}>
              <Text style={{ color: gain >= 0 ? colors.bullish : colors.bearish, fontSize: 14, fontWeight: font.semibold, fontVariant: ["tabular-nums"] }}>{signedUsd(gain)} invested growth</Text>
              <TrendPill value={gainPct} />
            </View>
          </View>
        </View>
        <InteractiveLineChart
          testID="portfolio-chart"
          chartLabel="Portfolio equity"
          height={isTablet ? 286 : 210}
          points={snapshots.map((snapshot) => ({ value: Number(snapshot.equity), label: new Date(snapshot.created_at).toLocaleDateString([], { month: "short", day: "numeric" }) }))}
          baseline={Number(snapshots[0]?.equity ?? account.equity)}
          negative={gain < 0}
          formatValue={(value) => usd(value, 0)}
          compareEnabled={compare}
          onCompareChange={setCompare}
          emptyTitle="Portfolio history is building"
          emptyBody="Your verified equity snapshots will appear here after the account records market activity."
        />
      </View>
    </Surface>
  );

  const decisionRail = (
    <View style={{ flex: isTablet ? 0.75 : undefined, gap: space.x4 }}>
      <Surface>
        <Eyebrow>Available now</Eyebrow>
        <View style={{ marginTop: space.x3, flexDirection: "row", gap: space.x4 }}>
          <Metric label="Practice balance" value={usd(account.cash, 0)} />
          <Metric label="Invested" value={usd(account.positions_value, 0)} />
        </View>
      </Surface>
      <Surface>
        <View style={{ gap: space.x3 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.x3 }}>
            <View style={{ flex: 1 }}>
              <Eyebrow>Risk lens</Eyebrow>
              <Text style={{ marginTop: space.x1, color: colors.textPrimary, fontSize: 18, fontWeight: font.bold }}>Portfolio mix</Text>
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: 13, fontVariant: ["tabular-nums"] }}>{Math.round(concentration)}% top holding</Text>
          </View>
          <Allocation label="Practice balance" value={Number(account.cash)} total={allocationBase} tone={colors.textTertiary} />
          <Allocation label="Positions" value={Number(account.positions_value)} total={allocationBase} tone={colors.brand} />
          <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 19 }}>
            {largestPosition ? `${largestPosition.symbol} is your largest position. Review concentration alongside your learning goal.` : "Add a paper position to start reviewing allocation."}
          </Text>
        </View>
      </Surface>
      <Button label="Explore a practice trade" icon="search" onPress={goDiscover} />
    </View>
  );

  return (
    <View testID="screen-portfolio-ready" style={{ gap: space.x6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.x4 }}>
        <View style={{ flex: 1, gap: space.x1 }}>
          <Eyebrow>PaperAI Trader</Eyebrow>
          <Text style={{ color: colors.textPrimary, fontSize: isTablet ? 36 : 28, fontWeight: font.bold }}>Good morning, {firstName(account.display_name) || "Trader"}</Text>
        </View>
        <Avatar uri={me?.profile?.avatar_url} name={account.display_name} size={44} />
        {refreshing ? <ActivityIndicator accessibilityLabel="Refreshing market data" color={colors.brand} /> : null}
      </View>

      <Surface style={{ paddingVertical: space.x3 }}>
        <View accessibilityLabel={`${account.display_name}'s simulated practice portfolio`} style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: space.x3 }}>
          <View style={{ width: 36, height: 36, borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: colors.brandSoft }}>
            <Feather name="briefcase" size={17} color={colors.brand} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ color: colors.textPrimary, fontSize: 14, fontWeight: font.bold }}>Practice Portfolio</Text>
            <Text numberOfLines={1} style={{ marginTop: 2, color: colors.textSecondary, fontSize: 11 }}>{account.display_name} · Simulated account</Text>
          </View>
          <PaperBadge compact />
        </View>
      </Surface>

      <View style={{ flexDirection: isTablet ? "row" : "column", alignItems: "stretch", gap: space.x4 }}>
        {hero}
        {decisionRail}
      </View>

      <View style={{ flexDirection: isTablet ? "row" : "column", alignItems: "flex-start", gap: space.x6 }}>
        <Section title="Holdings" eyebrow={`${me.positions.length} positions`} testID="portfolio-holdings" style={{ flex: 1, width: "100%" }}>
          <Surface style={{ flex: 1 }}>
            {me.positions.length ? me.positions.slice(0, isTablet ? 7 : 5).map((position, index) => (
              <View key={position.symbol}>
                <MarketRow symbol={position.symbol} quote={quotes[position.symbol]} position={position} onPress={() => openSymbol(position.symbol)} testID={`holding-${position.symbol}`} />
                {index < Math.min(me.positions.length, isTablet ? 7 : 5) - 1 ? <Divider /> : null}
              </View>
            )) : <StatePanel compact title="No holdings yet" body="Research a symbol and review your first simulated order." actionLabel="Open Discover" onAction={goDiscover} />}
          </Surface>
        </Section>

        <View style={{ flex: isTablet ? 0.8 : undefined, width: isTablet ? 360 : "100%", gap: space.x6 }}>
          <Section title="Recent practice" eyebrow="Orders">
            <Surface>
              {me.orders.length ? me.orders.slice(0, 4).map((order, index) => (
                <View key={order.id}>
                  <OrderLine order={order} />
                  {index < Math.min(me.orders.length, 4) - 1 ? <Divider /> : null}
                </View>
              )) : <StatePanel compact title="No paper orders yet" body="Completed and pending practice orders will appear here." />}
            </Surface>
          </Section>
          <Section title="Account pulse" eyebrow="Review">
            <Surface>
              <Row title="Largest mover" sub={largestMover ? getCompanyName(largestMover.symbol) : "None yet"} right={largestMover ? signedUsd(largestMover.unrealized_pl) : "—"} tone={(largestMover?.unrealized_pl ?? 0) >= 0 ? colors.bullish : colors.bearish} icon="activity" onPress={largestMover ? () => openSymbol(largestMover.symbol) : undefined} />
              <Divider />
              <Row title="Active alerts" sub="Watching your market ideas" right={String(me.alerts?.filter((alert) => alert.status === "active").length ?? 0)} icon="bell" />
              <Divider />
              <Row title="Watchlist" sub="Symbols saved for research" right={String(me.watchlist?.length ?? 0)} icon="eye" onPress={goDiscover} />
            </Surface>
          </Section>
        </View>
      </View>
    </View>
  );
}

type DiscoverScreenProps = {
  view: DiscoverView;
  setView: (view: DiscoverView) => void;
  me: Me | null;
  quotes: Record<string, Quote>;
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;
  bars: Bar[];
  chartRange: string;
  setChartRange: (range: string) => void;
  quote?: Quote | null;
  position?: Position | null;
  search: string;
  setSearch: (value: string) => void;
  searchResult: { symbol: string; quote: Quote } | null;
  searchLoading: boolean;
  searchError: string;
  side: Side;
  setSide: (side: Side) => void;
  orderType: OrderType;
  setOrderType: (value: OrderType) => void;
  amountMode: AmountMode;
  setAmountMode: (value: AmountMode) => void;
  amount: string;
  setAmount: (value: string) => void;
  limitPrice: string;
  setLimitPrice: (value: string) => void;
  orderStage: OrderStage;
  setOrderStage: (stage: OrderStage) => void;
  reviewQuotePrice: number | null;
  lastOrder: Order | null;
  submitOrder: () => void;
  orderBusy: boolean;
  orderMessage: string;
  addWatch: () => void;
  createAlert: (direction: "above" | "below") => void;
  goPortfolio: () => void;
};

export function DiscoverScreen(props: DiscoverScreenProps) {
  if (props.view === "order") return <OrderScreen {...props} />;
  if (props.view === "detail") return <StockDetailScreen {...props} />;
  return <DiscoverListScreen {...props} />;
}

function DiscoverListScreen({
  me,
  quotes,
  setSelectedSymbol,
  setView,
  search,
  setSearch,
  searchResult,
  searchLoading,
  searchError,
}: DiscoverScreenProps) {
  const { width } = useWindowDimensions();
  const isTablet = width >= layoutBreakpoints.regular;
  const [category, setCategory] = useState("Top");
  const owned = me?.positions.map((position) => position.symbol) ?? [];
  const watch = me?.watchlist?.map((item) => item.symbol) ?? [];
  const top = Object.values(quotes)
    .filter((quote): quote is Quote & { symbol: string } => Boolean(quote.symbol))
    .slice()
    .sort((a, b) => Number(b.changePercent ?? 0) - Number(a.changePercent ?? 0))
    .map((quote) => quote.symbol)
    .slice(0, 10);
  const categories = ["Top", "Owned", "Watchlist", "Popular", "Tech", "Finance", "ETFs", "Consumer"];
  const symbols = category === "Top" ? (top.length ? top : MARKET_GROUPS.Popular) : category === "Owned" ? owned : category === "Watchlist" ? watch : MARKET_GROUPS[category] ?? MARKET_GROUPS.Popular;

  function open(symbol: string) {
    setSelectedSymbol(symbol);
    setView("detail");
  }

  const marketList = (
    <Surface>
      {symbols.length ? symbols.map((symbol, index) => (
        <View key={symbol}>
          <MarketRow symbol={symbol} quote={quotes[symbol]} position={me?.positions.find((position) => position.symbol === symbol) ?? null} onPress={() => open(symbol)} />
          {index < symbols.length - 1 ? <Divider /> : null}
        </View>
      )) : <StatePanel compact title="Nothing saved here yet" body="Add a symbol to your watchlist or place a paper trade to build this view." />}
    </Surface>
  );

  return (
    <View testID="screen-discover-ready" style={{ gap: space.x6 }}>
      <View style={{ flexDirection: isTablet ? "row" : "column", justifyContent: "space-between", alignItems: isTablet ? "flex-end" : "flex-start", gap: space.x4 }}>
        <View style={{ maxWidth: 620, gap: space.x2 }}>
          <Eyebrow>PaperAI Trader</Eyebrow>
          <Text style={{ color: colors.textPrimary, fontSize: isTablet ? 38 : 30, lineHeight: isTablet ? 42 : 34, fontWeight: font.bold }}>Markets</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20 }}>Research ideas and review every simulated order before submitting.</Text>
        </View>
        <View style={{ width: isTablet ? 360 : "100%" }}>
          <Input
            testID="market-search"
            accessibilityLabel="Search stocks and ETFs"
            value={search}
            onChangeText={(value) => setSearch(value.toUpperCase())}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="Search ticker or company"
          />
        </View>
      </View>

      {searchLoading ? <InlineNotice title="Searching verified market data" body="Results will appear without replacing your current list." /> : null}
      {searchError && !searchLoading ? <InlineNotice tone="warning" title="Search needs attention" body={searchError} /> : null}
      {searchResult ? (
        <Surface elevated>
          <Eyebrow>Search result</Eyebrow>
          <MarketRow symbol={searchResult.symbol} quote={searchResult.quote} position={me?.positions.find((position) => position.symbol === searchResult.symbol) ?? null} onPress={() => open(searchResult.symbol)} />
        </Surface>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.x2 }}>
        {categories.map((item) => <FilterChip key={item} label={item} active={category === item} onPress={() => setCategory(item)} />)}
      </ScrollView>

      <View style={{ flexDirection: isTablet ? "row" : "column", alignItems: "flex-start", gap: space.x6 }}>
        <View style={{ flex: 1.35, width: "100%" }}>
          <Section title={category === "Top" ? "Market leaders" : category} eyebrow="Available quote data">
            {marketList}
          </Section>
        </View>
        {isTablet ? (
          <View style={{ width: 330, gap: space.x6 }}>
            <Section title="Research checklist" eyebrow="Before you trade">
              <Surface>
                <ChecklistRow icon="activity" title="Read the move" body="Separate today’s change from the long-term thesis." />
                <Divider />
                <ChecklistRow icon="pie-chart" title="Check exposure" body="Know how the position changes your allocation." />
                <Divider />
                <ChecklistRow icon="edit-3" title="Name the reason" body="A clear thesis makes review more useful." />
              </Surface>
            </Section>
            <InlineNotice tone="info" title="Estimates can move" body="Quotes and order totals can change before a simulated market order fills." />
          </View>
        ) : null}
      </View>
    </View>
  );
}

function StockDetailScreen(props: DiscoverScreenProps) {
  const {
    selectedSymbol,
    quote,
    position,
    bars,
    chartRange,
    setChartRange,
    setView,
    setSide,
    setOrderStage,
    addWatch,
    createAlert,
  } = props;
  const { width } = useWindowDimensions();
  const isTablet = width >= layoutBreakpoints.regular;
  const [compare, setCompare] = useState(false);
  const hasQuote = quote != null && Number.isFinite(Number(quote.price)) && Number(quote.price) > 0;
  const price = hasQuote ? Number(quote.price) : 0;
  const change = hasQuote ? Number(quote.change ?? (quote.prevClose ? price - quote.prevClose : 0)) : 0;
  const changePct = hasQuote ? Number(quote.changePercent ?? (quote.prevClose ? (change / quote.prevClose) * 100 : 0)) : 0;
  const up = change >= 0;
  const isWatched = Boolean(props.me?.watchlist?.some((item) => item.symbol === selectedSymbol));
  const chartPoints = bars.map((bar) => ({
    value: Number(bar.c),
    label: new Date(bar.t).toLocaleString([], chartRange === "1h" || chartRange === "1d" ? { hour: "2-digit", minute: "2-digit" } : { month: "short", day: "numeric" }),
  }));

  function openOrder(nextSide: Side) {
    setSide(nextSide);
    setOrderStage("configure");
    setView("order");
  }

  const chartWorkspace = (
    <Surface elevated style={{ flex: isTablet ? 1.45 : undefined, padding: isTablet ? space.x6 : space.x4 }}>
      <View style={{ gap: space.x4 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: space.x4 }}>
          <View style={{ gap: space.x3 }}>
            <StockLogo symbol={selectedSymbol} size={58} />
            <View style={{ gap: space.x1 }}>
              <Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} style={{ color: colors.textPrimary, fontSize: isTablet ? 58 : 48, lineHeight: isTablet ? 62 : 54, fontWeight: font.semibold, fontVariant: ["tabular-nums"] }}>{hasQuote ? usd(price) : "Price unavailable"}</Text>
              {hasQuote ? (
                <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: space.x3 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 16, fontVariant: ["tabular-nums"] }}>{signedUsd(change)} today</Text>
                  <TrendPill value={changePct} />
                </View>
              ) : <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Verified quote data has not loaded for this symbol.</Text>}
            </View>
          </View>
          <PaperBadge compact />
        </View>

        <InteractiveLineChart
          testID={`chart-${selectedSymbol}`}
          chartLabel={`${selectedSymbol} price`}
          height={isTablet ? 340 : 270}
          points={chartPoints}
          negative={!up}
          baseline={quote?.prevClose ?? undefined}
          formatValue={(value) => usd(value)}
          compareEnabled={compare}
          onCompareChange={setCompare}
          emptyTitle="Verified history unavailable"
          emptyBody="Try another range or refresh. PaperAI will not draw invented price movement."
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.x2 }}>
          {chartRanges.map(([range, label]) => <FilterChip key={range} label={label} active={chartRange === range} onPress={() => setChartRange(range)} />)}
        </ScrollView>
      </View>
    </Surface>
  );

  const researchRail = (
    <View style={{ flex: isTablet ? 0.8 : undefined, gap: space.x4 }}>
      <Surface>
        <Eyebrow>Your position</Eyebrow>
        <View style={{ marginTop: space.x3, flexDirection: "row", gap: space.x4 }}>
          <Metric label="Quantity" value={position ? Number(position.qty).toFixed(4) : "0"} />
          <Metric label="Market value" value={usd(position?.market_value ?? 0, 0)} />
        </View>
        {position ? (
          <View style={{ marginTop: space.x4 }}>
            <InlineNotice tone={position.unrealized_pl >= 0 ? "success" : "warning"} title={`${signedUsd(position.unrealized_pl)} unrealized`} body="Paper returns are learning feedback, not real-world gain or loss." />
          </View>
        ) : null}
      </Surface>

      <Surface>
        <Eyebrow>Research actions</Eyebrow>
        <View style={{ marginTop: space.x3, gap: space.x2 }}>
          <Button label={isWatched ? "Saved to watchlist" : "Save to watchlist"} variant="secondary" icon={isWatched ? "check" : "eye"} onPress={addWatch} disabled={isWatched} disabledReason={`${selectedSymbol} is already in your watchlist.`} />
          <View style={{ flexDirection: "row", gap: space.x2 }}>
            <Button label="Alert above" variant="quiet" icon="arrow-up" onPress={() => createAlert("above")} disabled={!hasQuote} disabledReason="A verified quote is required before creating an alert." style={{ flex: 1 }} />
            <Button label="Alert below" variant="quiet" icon="arrow-down" onPress={() => createAlert("below")} disabled={!hasQuote} disabledReason="A verified quote is required before creating an alert." style={{ flex: 1 }} />
          </View>
        </View>
      </Surface>

      <View style={{ flexDirection: "row", gap: space.x3 }}>
        <Button testID={`trade-sell-${selectedSymbol}`} label="Sell" variant="secondary" onPress={() => openOrder("sell")} disabled={!hasQuote} disabledReason="A verified quote is required before configuring a paper order." style={{ flex: 1 }} />
        <Button testID={`trade-buy-${selectedSymbol}`} label="Buy" onPress={() => openOrder("buy")} disabled={!hasQuote} disabledReason="A verified quote is required before configuring a paper order." style={{ flex: 1 }} />
      </View>
    </View>
  );

  return (
    <View testID={`quote-${selectedSymbol}-ready`} style={{ gap: space.x6 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: space.x3 }}>
        <IconButton icon="chevron-left" label="Back to Discover" onPress={() => setView("list")} />
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: font.bold }}>{selectedSymbol}</Text>
          <Text style={{ marginTop: space.x1, color: colors.textSecondary, fontSize: 12 }} numberOfLines={1}>{quote?.name ?? getCompanyName(selectedSymbol)}</Text>
        </View>
        <IconButton icon="bell" label={`Create ${selectedSymbol} alert`} onPress={() => createAlert("above")} disabled={!hasQuote} accessibilityHint={!hasQuote ? "A verified quote is required first." : undefined} />
      </View>

      <View style={{ flexDirection: isTablet ? "row" : "column", alignItems: "stretch", gap: space.x4 }}>
        {chartWorkspace}
        {researchRail}
      </View>

      <Section title="Fundamentals" eyebrow="Plain-language context">
        <Surface>
          <Row title="P/E ratio" sub="Price compared with the last 12 months of earnings" right={metric(quote?.trailingPE)} icon="bar-chart-2" />
          <Divider />
          <Row title="Market cap" sub="Estimated total value of public shares" right={compactMoney(quote?.marketCap)} icon="pie-chart" />
          <Divider />
          <Row title="Volume" sub={`Typical session ${compactNumber(quote?.averageVolume)}`} right={compactNumber(quote?.volume)} icon="activity" />
          <Divider />
          <Row title="Day range" sub={`Opened near ${maybeUsd(quote?.open)}`} right={rangeLabel(quote?.dayLow ?? null, quote?.dayHigh ?? null)} icon="maximize-2" />
          <Divider />
          <Row title="52-week range" sub={!quote ? "Quote data unavailable" : quote.updatedAt ? `Quote updated ${timeAgo(quote.updatedAt)}` : "Quote timestamp unavailable"} right={rangeLabel(quote?.yearLow ?? null, quote?.yearHigh ?? null)} icon="calendar" />
        </Surface>
      </Section>
    </View>
  );
}

function OrderScreen(props: DiscoverScreenProps) {
  const {
    selectedSymbol,
    quote,
    position,
    side,
    setSide,
    orderType,
    setOrderType,
    amountMode,
    setAmountMode,
    amount,
    setAmount,
    limitPrice,
    setLimitPrice,
    orderStage,
    setOrderStage,
    reviewQuotePrice,
    lastOrder,
    submitOrder,
    orderBusy,
    orderMessage,
    setView,
    me,
    goPortfolio,
  } = props;
  const { width } = useWindowDimensions();
  const isTablet = width >= layoutBreakpoints.regular;
  const price = orderType === "limit" && Number(limitPrice) > 0 ? Number(limitPrice) : orderStage === "review" && reviewQuotePrice != null ? reviewQuotePrice : quote?.price ?? 0;
  const cash = Number(me?.account?.cash ?? 0);
  const ownedQty = Number(position?.qty ?? 0);
  const ownedValue = ownedQty * (quote?.price ?? 0);
  const numAmount = Number(amount) || 0;
  const desiredShares = amountMode === "dollars" ? (price > 0 ? numAmount / price : 0) : numAmount;
  const notional = desiredShares * price;
  const sellTooMuch = side === "sell" && desiredShares > ownedQty + 0.00001;
  const buyTooMuch = side === "buy" && notional > cash + 0.01;
  const invalidLimit = orderType === "limit" && (!Number.isFinite(Number(limitPrice)) || Number(limitPrice) <= 0);
  // Account, position, and quote are refreshed before review, so this draft
  // cannot disable a legitimate ticket merely because background state is old.
  const canReview = numAmount > 0 && !invalidLimit;
  const validationMessage = sellTooMuch
    ? `Current estimate: up to ${ownedQty.toFixed(4)} shares. The latest position will be checked before review.`
    : buyTooMuch
      ? "Current estimate is above buying power. The latest account will be checked before review."
      : invalidLimit
        ? "Enter a valid limit price before review."
        : desiredShares <= 0
          ? "Enter a share or dollar amount to continue."
          : price <= 0
            ? "The latest verified quote will be loaded before review."
            : "Ready for a final simulated-order review.";

  function setMax() {
    if (side === "sell") setAmount(amountMode === "shares" ? ownedQty.toFixed(4) : ownedValue.toFixed(2));
    else setAmount(amountMode === "shares" && price > 0 ? (Math.floor((cash / price) * 10000) / 10000).toFixed(4) : cash.toFixed(2));
  }

  if (orderStage === "processing") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space.x4, padding: space.x6, backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.brand} accessibilityLabel="Submitting paper order" />
        <Text accessibilityLiveRegion="polite" style={{ color: colors.textPrimary, fontSize: 17, fontWeight: font.semibold }}>Submitting paper order…</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{side === "buy" ? "Buying" : "Selling"} {selectedSymbol} with simulated funds</Text>
      </View>
    );
  }

  if (orderStage === "receipt") {
    return (
      <OrderReceiptScreen
        order={lastOrder}
        symbol={selectedSymbol}
        quote={quote}
        message={orderMessage}
        goPortfolio={goPortfolio}
        backToSymbol={() => {
          setOrderStage("configure");
          setView("detail");
        }}
      />
    );
  }

  if (orderStage === "review") {
    return (
      <OrderReviewScreen
        symbol={selectedSymbol}
        side={side}
        orderType={orderType}
        amountMode={amountMode}
        amount={numAmount}
        shares={desiredShares}
        price={price}
        notional={notional}
        cash={cash}
        ownedQty={ownedQty}
        limitPrice={Number(limitPrice)}
        busy={orderBusy}
        message={orderMessage}
        edit={() => setOrderStage("configure")}
        confirm={submitOrder}
      />
    );
  }

  const entry = (
    <View style={{ flex: isTablet ? 1.2 : undefined, gap: space.x4 }}>
      <Segment testID="order-side" value={side} options={[["buy", "Buy"], ["sell", "Sell"]]} onChange={setSide} />
      <View style={{ flexDirection: isTablet ? "row" : "column", gap: space.x3 }}>
        <View style={{ flex: 1 }}><Segment testID="order-type" value={orderType} options={[["market", "Market"], ["limit", "Limit"]]} onChange={setOrderType} /></View>
        <View style={{ flex: 1 }}><Segment testID="order-mode" value={amountMode} options={[["shares", "Shares"], ["dollars", "Dollars"]]} onChange={setAmountMode} /></View>
      </View>
      <Input
        testID="order-amount"
        label={amountMode === "shares" ? "Number of shares" : "Practice dollars"}
        helper={amountMode === "dollars" ? "We convert dollars to fractional shares using the estimated order price." : "Fractional quantities are rounded down to four decimals."}
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
        placeholder={amountMode === "shares" ? "0.0000" : "0.00"}
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.x2 }}>
        {(amountMode === "shares" ? ["1", "5", "10"] : ["100", "500", "1000"]).map((preset) => (
          <PresetChip key={preset} label={amountMode === "shares" ? `${preset} shares` : `$${preset}`} onPress={() => setAmount(preset)} />
        ))}
        <PresetChip label="Max" onPress={setMax} />
      </View>
      {orderType === "limit" ? <Input testID="order-limit-price" label="Limit price" helper="The paper order waits unless the market reaches this price or better." keyboardType="decimal-pad" value={limitPrice} onChangeText={setLimitPrice} placeholder="0.00" error={invalidLimit && limitPrice ? "Use a price greater than zero." : undefined} /> : null}
    </View>
  );

  const summary = (
    <View style={{ flex: isTablet ? 0.8 : undefined, gap: space.x4 }}>
      <Surface elevated>
        <Eyebrow>Estimated impact</Eyebrow>
        <View style={{ marginTop: space.x3 }}>
          <Row title="Estimated price" sub={orderType === "market" ? "Latest quote; fill can move" : "Your limit price"} right={price ? usd(price) : "—"} />
          <Divider />
          <Row title={side === "buy" ? "Estimated cost" : "Estimated proceeds"} sub={`${desiredShares.toFixed(4)} shares`} right={usd(notional)} />
          <Divider />
          <Row title={side === "buy" ? "Buying power after" : "Shares after sale"} sub="Before pending-order adjustments" right={side === "buy" ? usd(Math.max(0, cash - notional)) : Math.max(0, ownedQty - desiredShares).toFixed(4)} />
        </View>
      </Surface>
      <InlineNotice tone={canReview ? "success" : "warning"} title={canReview ? "Ready to review" : "Review is locked"} body={validationMessage} />
      <Button
        testID="order-review"
        label={orderBusy ? "Checking latest order details…" : "Review simulated order"}
        icon="arrow-right"
        onPress={() => setOrderStage("review")}
        disabled={!canReview || orderBusy}
        disabledReason={validationMessage}
      />
      <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 18, textAlign: "center" }}>No order is sent until you confirm on the next screen.</Text>
    </View>
  );

  return (
    <View testID="screen-order-configure" style={{ gap: space.x6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.x4 }}>
        <View style={{ flex: 1, gap: space.x2 }}>
          <PaperBadge compact />
          <Text style={{ color: colors.textPrimary, fontSize: isTablet ? 42 : 34, lineHeight: isTablet ? 46 : 38, fontWeight: font.bold }}>{side === "buy" ? "Buy" : "Sell"} {selectedSymbol}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Configure first, then review every detail.</Text>
        </View>
        <IconButton icon="x" label="Close order ticket" onPress={() => setView("detail")} />
      </View>
      <View style={{ flexDirection: isTablet ? "row" : "column", alignItems: "flex-start", gap: space.x6 }}>
        {entry}
        {summary}
      </View>
    </View>
  );
}

function OrderReviewScreen({
  symbol,
  side,
  orderType,
  amountMode,
  amount,
  shares,
  price,
  notional,
  cash,
  ownedQty,
  limitPrice,
  busy,
  message,
  edit,
  confirm,
}: {
  symbol: string;
  side: Side;
  orderType: OrderType;
  amountMode: AmountMode;
  amount: number;
  shares: number;
  price: number;
  notional: number;
  cash: number;
  ownedQty: number;
  limitPrice: number;
  busy: boolean;
  message: string;
  edit: () => void;
  confirm: () => void;
}) {
  const { width } = useWindowDimensions();
  const isTablet = width >= layoutBreakpoints.regular;
  return (
    <View testID="screen-order-review-ready" style={{ gap: isTablet ? space.x6 : space.x4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.x4 }}>
        <View style={{ flex: 1, gap: isTablet ? space.x2 : space.x1 }}>
          <PaperBadge />
          <Eyebrow>Final check · no real money</Eyebrow>
          <Text style={{ color: colors.textPrimary, fontSize: isTablet ? 44 : 32, lineHeight: isTablet ? 48 : 36, fontWeight: font.bold }}>Review simulated order</Text>
        </View>
        <IconButton icon="edit-2" label="Edit order" onPress={edit} />
      </View>

      <View style={{ flexDirection: isTablet ? "row" : "column", alignItems: "stretch", gap: isTablet ? space.x6 : space.x4 }}>
        <Surface elevated style={{ flex: 1.2, padding: isTablet ? space.x8 : space.x3 }}>
          <View style={{ gap: isTablet ? space.x6 : space.x4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.x4 }}>
              <StockLogo symbol={symbol} size={isTablet ? 64 : 48} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{side === "buy" ? "Simulated buy" : "Simulated sell"}</Text>
                <Text style={{ marginTop: space.x1, color: colors.textPrimary, fontSize: isTablet ? 30 : 26, fontWeight: font.bold }}>{symbol}</Text>
              </View>
              <View accessibilityLabel={`${side === "buy" ? "Buy" : "Sell"} side`} style={{ minHeight: 34, flexDirection: "row", alignItems: "center", gap: space.x1, paddingHorizontal: space.x3, borderWidth: 1, borderColor: side === "buy" ? colors.brand : colors.borderStrong, backgroundColor: side === "buy" ? colors.brandSoft : colors.background }}>
                <Feather name={side === "buy" ? "arrow-up-right" : "arrow-down-right"} size={14} color={side === "buy" ? colors.brand : colors.textSecondary} />
                <Text style={{ color: side === "buy" ? colors.brand : colors.textPrimary, fontSize: 13, fontWeight: font.bold }}>{side === "buy" ? "BUY" : "SELL"}</Text>
              </View>
            </View>
            <View>
              <Row compact={!isTablet} title="Order type" sub={orderType === "market" ? "Estimated from the latest quote" : `Will wait at ${usd(limitPrice)}`} right={orderType === "market" ? "Market" : "Limit"} />
              <Divider />
              <Row compact={!isTablet} title="Amount entered" sub={amountMode === "shares" ? "Share quantity" : "Practice-dollar notional"} right={amountMode === "shares" ? `${amount.toFixed(4)} sh` : usd(amount)} />
              <Divider />
              <Row compact={!isTablet} title="Estimated shares" sub="Rounded down to four decimals" right={shares.toFixed(4)} />
              <Divider />
              <Row compact={!isTablet} title="Estimated price" sub="May differ if the market moves" right={usd(price)} />
              <Divider />
              <Row compact={!isTablet} title={side === "buy" ? "Estimated total" : "Estimated proceeds"} sub="Simulated funds only" right={usd(notional)} />
            </View>
          </View>
        </Surface>

        <View style={{ flex: 0.8, gap: isTablet ? space.x4 : space.x3 }}>
          <Surface style={!isTablet ? { padding: space.x3 } : undefined}>
            <Eyebrow>After this order</Eyebrow>
            <View style={{ marginTop: space.x3, flexDirection: "row", gap: space.x4 }}>
              <Metric label={side === "buy" ? "Buying power" : "Shares left"} value={side === "buy" ? usd(Math.max(0, cash - notional), 0) : Math.max(0, ownedQty - shares).toFixed(4)} />
              <Metric label="Estimated total" value={usd(notional, 0)} />
            </View>
          </Surface>
          <InlineNotice tone="info" title="This is a paper trade" body="Only your simulated portfolio changes—no deposits, withdrawals, payouts, or cash-out." />
          {message ? <InlineNotice tone="error" title="The order was not submitted" body={message} /> : null}
          <Button testID="order-confirm" label={busy ? "Submitting paper order…" : "Confirm paper trade"} icon="check" onPress={confirm} loading={busy} />
          {isTablet ? <Button label="Edit details" variant="secondary" onPress={edit} disabled={busy} /> : null}
        </View>
      </View>
    </View>
  );
}

function OrderReceiptScreen({
  order,
  symbol,
  quote,
  message,
  goPortfolio,
  backToSymbol,
}: {
  order: Order | null;
  symbol: string;
  quote?: Quote | null;
  message: string;
  goPortfolio: () => void;
  backToSymbol: () => void;
}) {
  const successful = Boolean(order);
  // Purchase animation: receipt settles in with a scale/fade spring after a
  // short beat, echoing the market-style order confirmation.
  const entrance = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(120),
      Animated.spring(entrance, { toValue: 1, useNativeDriver: true, friction: 6, tension: 60 }),
    ]).start();
  }, [entrance]);
  return (
    <Animated.View
      testID="screen-order-receipt-ready"
      style={{
        alignSelf: "center",
        width: "100%",
        maxWidth: 720,
        gap: space.x6,
        opacity: entrance,
        transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }, { scale: entrance.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) }],
      }}
    >
      <Surface elevated style={{ padding: space.x8 }}>
        <View style={{ alignItems: "center", gap: space.x4 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: radius.xl,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: successful ? colors.bullishSoft : colors.bearishSoft,
              transform: [{ scale: entrance.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.4, 1.12, 1] }) }],
            }}
          >
            <Feather name={successful ? "check" : "alert-circle"} size={32} color={successful ? colors.bullish : colors.bearish} />
          </View>
          <PaperBadge />
          <View style={{ alignItems: "center", gap: space.x2 }}>
            <Text style={{ color: colors.textPrimary, fontSize: 34, fontWeight: font.bold }}>{successful ? "Paper order received" : "Order needs attention"}</Text>
            <Text style={{ maxWidth: 520, color: colors.textSecondary, fontSize: 15, lineHeight: 22, textAlign: "center" }}>{message || "Review the details and try again when a verified quote is available."}</Text>
          </View>
          {order ? (
            <View style={{ alignSelf: "stretch", marginTop: space.x2 }}>
              <Row title={`${order.side === "buy" ? "Buy" : "Sell"} ${order.symbol}`} sub={`${Number(order.qty).toFixed(4)} shares · ${order.type}`} right={order.status.replace(/_/g, " ")} />
              <Divider />
              <Row title="Reference" sub="Paper order ID" right={order.id.slice(0, 8).toUpperCase()} />
              <Divider />
              <Row
                title={order.filled_avg_price != null ? "Paper fill price" : "Latest reference price"}
                sub={order.filled_avg_price != null ? "Recorded simulated execution" : "Pending orders may fill later"}
                right={order.filled_avg_price != null ? usd(Number(order.filled_avg_price)) : quote ? usd(quote.price) : "—"}
              />
              {order.created_at ? (
                <>
                  <Divider />
                  <Row title="Submitted" sub="Device-local time" right={formatOrderTime(order.created_at)} />
                </>
              ) : null}
            </View>
          ) : null}
          <InlineNotice tone="success" title="Learning prompt" body="Before moving on, note what would confirm or invalidate your original thesis." />
          <View style={{ alignSelf: "stretch", flexDirection: "row", gap: space.x3 }}>
            <Button label="Back to symbol" variant="secondary" onPress={backToSymbol} style={{ flex: 1 }} />
            <Button label="View portfolio" onPress={goPortfolio} style={{ flex: 1 }} />
          </View>
        </View>
      </Surface>
    </Animated.View>
  );
}

export function CompeteScreen({
  entries,
  currentAccountId,
}: {
  entries: LeaderboardEntry[];
  currentAccountId?: string;
}) {
  const { width } = useWindowDimensions();
  const isTablet = width >= layoutBreakpoints.regular;
  const currentRank = entries.findIndex((entry) => entry.account_id === currentAccountId);
  const current = currentRank >= 0 ? entries[currentRank] : null;
  const leader = entries[0];

  const leaderboard = entries.length ? (
    <Surface testID="leaderboard-ready">
      {entries.map((entry, index) => {
        const isCurrent = entry.account_id === currentAccountId;
        return (
          <View key={entry.account_id}>
            <View accessibilityLabel={`Rank ${index + 1}, ${entry.display_name}, ${signedPct(entry.return_pct)} simulated return`} style={{ minHeight: 68, flexDirection: "row", alignItems: "center", gap: space.x3 }}>
              <View style={{ width: 38, height: 38, borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: index < 3 ? colors.brandSoft : colors.surfaceMuted }}>
                <Text style={{ color: index < 3 ? colors.brand : colors.textSecondary, fontWeight: font.bold }}>{index + 1}</Text>
              </View>
              <Avatar name={entry.display_name} size={40} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ color: colors.textPrimary, fontSize: 15, fontWeight: isCurrent ? font.bold : font.semibold }}>{entry.display_name}{isCurrent ? " · You" : ""}</Text>
                <Text style={{ marginTop: space.x1, color: colors.textSecondary, fontSize: 12 }}>Simulated equity {usd(entry.equity, 0)}</Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: space.x1 }}>
                <Text style={{ color: entry.return_pct >= 0 ? colors.bullish : colors.bearish, fontSize: 15, fontWeight: font.bold, fontVariant: ["tabular-nums"] }}>{signedPct(entry.return_pct)}</Text>
                <Text style={{ color: colors.textTertiary, fontSize: 10 }}>INVESTED</Text>
              </View>
            </View>
            {index < entries.length - 1 ? <Divider /> : null}
          </View>
        );
      })}
    </Surface>
  ) : <StatePanel title="No rankings yet" body="Pull to refresh after your club competition begins." icon="award" />;

  return (
    <View testID="screen-competition-ready" style={{ gap: space.x8 }}>
      <View style={{ maxWidth: 680, gap: space.x2 }}>
        <PaperBadge compact />
        <Eyebrow>Learning together</Eyebrow>
        <Text style={{ color: colors.textPrimary, fontSize: isTablet ? 42 : 34, lineHeight: isTablet ? 46 : 38, fontWeight: font.bold }}>Club rankings</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 22 }}>Compare simulated returns constructively. Rank is context—not a reason to trade more often.</Text>
      </View>

      <View style={{ flexDirection: isTablet ? "row" : "column", alignItems: "flex-start", gap: space.x6 }}>
        <View style={{ flex: isTablet ? 0.75 : undefined, width: "100%", gap: space.x4 }}>
          {current ? (
            <Surface elevated tone={colors.brandSoft}>
              <Eyebrow>Your position</Eyebrow>
              <View style={{ marginTop: space.x3, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: space.x4 }}>
                <Text style={{ color: colors.textPrimary, fontSize: 48, fontWeight: font.bold }}>#{currentRank + 1}</Text>
                <TrendPill value={current.return_pct} />
              </View>
              <Text style={{ marginTop: space.x2, color: colors.textSecondary, fontSize: 13 }}>{entries.length} active learners · {usd(current.equity, 0)} simulated equity</Text>
            </Surface>
          ) : (
            <Surface><Text style={{ color: colors.textSecondary }}>Join an active club to see your position.</Text></Surface>
          )}
          {isTablet ? <WeeklyReviewCard /> : null}
          {isTablet && leader ? <InlineNotice tone="info" title={`${leader.display_name} leads this round`} body={`${signedPct(leader.return_pct)} simulated return. Study the process, not only the outcome.`} /> : null}
        </View>
        <View style={{ flex: isTablet ? 1.25 : undefined, width: "100%" }}>
          <Section title="Leaderboard" eyebrow="Privacy-safe display names">
            {leaderboard}
          </Section>
        </View>
      </View>
      {!isTablet ? <WeeklyReviewCard /> : null}
    </View>
  );
}

const PREDICTION_RANGES = [
  ["1", "1D"],
  ["7", "1W"],
  ["30", "1M"],
] as const;

type PredictionsScreenProps = {
  view: PredictionView;
  setView: (view: PredictionView) => void;
  markets: PredictionMarket[];
  me: Me | null;
  loading: boolean;
  selectedMarketId: string | null;
  openMarket: (id: string) => void;
  closeMarket: () => void;
  history: PredictionHistoryPoint[];
  historyLoading: boolean;
  loadHistory: (marketId: string, outcome: PredictionOutcome, days: number) => void;
  outcome: PredictionOutcome;
  setOutcome: (outcome: PredictionOutcome) => void;
  mode: Side;
  setMode: (mode: Side) => void;
  amount: string;
  setAmount: (value: string) => void;
  stage: OrderStage;
  setStage: (stage: OrderStage) => void;
  submit: () => void;
  busy: boolean;
  message: string;
  lastResult: PredictionTradeResult | null;
  goPortfolio: () => void;
};

export function PredictionsScreen(props: PredictionsScreenProps) {
  const selected = props.markets.find((market) => market.id === props.selectedMarketId) ?? null;
  if (props.view === "detail" && selected) return <PredictionDetailScreen {...props} market={selected} />;
  return <PredictionListScreen {...props} />;
}

function PredictionListScreen({ markets, me, loading, openMarket }: PredictionsScreenProps) {
  const { width } = useWindowDimensions();
  const isTablet = width >= layoutBreakpoints.regular;
  const [category, setCategory] = useState("All");
  const cash = Number(me?.account?.cash ?? 0);
  const positions = me?.prediction_positions ?? [];
  const categories = ["All", ...Array.from(new Set(markets.map((market) => predictionCategory(market.question, market.category))))];
  const visible = category === "All" ? markets : markets.filter((market) => predictionCategory(market.question, market.category) === category);

  return (
    <View testID="screen-predictions-ready" style={{ gap: space.x6 }}>
      <View style={{ flexDirection: isTablet ? "row" : "column", justifyContent: "space-between", alignItems: isTablet ? "flex-end" : "flex-start", gap: space.x4 }}>
        <View style={{ maxWidth: 620, gap: space.x2 }}>
          <PaperBadge compact />
          <Eyebrow>Paper predictions</Eyebrow>
          <Text style={{ color: colors.textPrimary, fontSize: isTablet ? 38 : 30, lineHeight: isTablet ? 42 : 34, fontWeight: font.bold }}>Predictions</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20 }}>Trade Yes/No outcome shares on real-world questions with paper cash. A correct share settles at $1.00; an incorrect share settles at $0.00.</Text>
        </View>
        <Surface style={{ minWidth: isTablet ? 220 : "100%" }}>
          <Eyebrow>Paper buying power</Eyebrow>
          <Text style={{ marginTop: space.x2, color: colors.textPrimary, fontSize: 24, fontWeight: font.bold, fontVariant: ["tabular-nums"] }}>{usd(cash, 0)}</Text>
        </Surface>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.x2 }}>
        {categories.map((item) => <FilterChip key={item} label={item} active={category === item} onPress={() => setCategory(item)} />)}
      </ScrollView>

      {positions.length ? (
        <Section title="Your prediction positions" eyebrow="Open outcome shares">
          <Surface>
            {positions.map((position, index) => {
              const market = markets.find((item) => item.id === position.market_id);
              const pl = Number(position.unrealized_pl ?? 0);
              return (
                <View key={`${position.market_id}-${position.outcome}`}>
                  <Row
                    title={position.question ?? market?.question ?? "Prediction market"}
                    sub={`${Number(position.shares).toFixed(2)} ${position.outcome.toUpperCase()} shares · Avg ${cents(position.avg_cost)}`}
                    right={position.market_value != null ? usd(position.market_value) : "—"}
                    tone={pl >= 0 ? colors.bullish : colors.bearish}
                    icon={position.outcome === "yes" ? "trending-up" : "trending-down"}
                    onPress={market ? () => openMarket(market.id) : undefined}
                  />
                  {index < positions.length - 1 ? <Divider /> : null}
                </View>
              );
            })}
          </Surface>
        </Section>
      ) : null}

      <Section title="Active markets" eyebrow="Live paper prices">
        {loading && !markets.length ? (
          <View accessibilityLabel="Loading prediction markets" style={{ gap: space.x3 }}>
            <SkeletonBlock height={96} radiusValue={radius.sm} />
            <SkeletonBlock height={96} radiusValue={radius.sm} />
            <SkeletonBlock height={96} radiusValue={radius.sm} />
          </View>
        ) : visible.length ? (
          <Surface>
            {visible.map((market, index) => (
              <View key={market.id}>
                <PredictionMarketRow market={market} onPress={() => openMarket(market.id)} />
                {index < visible.length - 1 ? <Divider /> : null}
              </View>
            ))}
          </Surface>
        ) : (
          <StatePanel compact icon="target" title="No prediction markets yet" body="Active outcome markets will appear here once live paper prices load." />
        )}
      </Section>
    </View>
  );
}

function PredictionMarketRow({ market, onPress }: { market: PredictionMarket; onPress: () => void }) {
  const category = predictionCategory(market.question, market.category);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${market.question}, Yes ${cents(market.yesPrice)}, ${probability(market.yesPrice)} implied, volume ${compactMoney(market.volume24hr)}`}
      accessibilityHint="Open this prediction market to review odds and trade"
      testID={`prediction-${market.id}`}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}
    >
      <View style={{ minHeight: 76, flexDirection: "row", alignItems: "center", gap: space.x3 }}>
        <View style={{ width: 44, height: 44, borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: colors.brandSoft }}>
          <Feather name="target" size={18} color={colors.brand} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: font.bold }} numberOfLines={2}>{market.question}</Text>
          <Text style={{ marginTop: space.x1, color: colors.textSecondary, fontSize: 12 }} numberOfLines={1}>{category} · Vol {compactMoney(market.volume24hr)} · Ends {predictionEndLabel(market.endDate)}</Text>
        </View>
        <View style={{ alignItems: "flex-end", minWidth: 88 }}>
          <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: font.bold, fontVariant: ["tabular-nums"] }}>{cents(market.yesPrice)} Yes</Text>
          <Text style={{ marginTop: space.x1, color: colors.brand, fontSize: 12, fontWeight: font.bold, fontVariant: ["tabular-nums"] }}>{probability(market.yesPrice)} implied</Text>
        </View>
      </View>
    </Pressable>
  );
}

function PredictionDetailScreen(props: PredictionsScreenProps & { market: PredictionMarket }) {
  const {
    market,
    me,
    closeMarket,
    history,
    historyLoading,
    loadHistory,
    outcome,
    setOutcome,
    mode,
    setMode,
    amount,
    setAmount,
    stage,
    setStage,
    submit,
    busy,
    message,
    lastResult,
    goPortfolio,
  } = props;
  const { width } = useWindowDimensions();
  const isTablet = width >= layoutBreakpoints.regular;
  const [range, setRange] = useState(7);
  const [compare, setCompare] = useState(false);

  const currentPrice = outcome === "yes" ? market.yesPrice : market.noPrice;
  const price = Number(currentPrice ?? 0);
  const cash = Number(me?.account?.cash ?? 0);
  const position = me?.prediction_positions?.find((item) => item.market_id === market.id && item.outcome === outcome) ?? null;
  const ownedShares = Number(position?.shares ?? 0);
  const isBuy = mode === "buy";
  const parsedAmount = Number(amount) || 0;
  const estimatedShares = isBuy ? (price > 0 && parsedAmount > 0 ? parsedAmount / price : 0) : Math.min(parsedAmount, ownedShares);
  const payoutIfCorrect = isBuy ? estimatedShares : 0;
  const potentialProfit = isBuy ? Math.max(0, estimatedShares - parsedAmount) : 0;
  const proceeds = estimatedShares * price;

  useEffect(() => {
    loadHistory(market.id, outcome, range);
    // loadHistory is recreated each render by the parent; depending on market/outcome/range only avoids a refetch loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [market.id, outcome, range]);

  useEffect(() => {
    if (mode === "sell" && ownedShares <= 0) setMode("buy");
  }, [mode, ownedShares, setMode]);

  const chartPoints = history
    .filter((point) => Number.isFinite(Number(point.p)))
    .map((point) => {
      const numeric = Number(point.t);
      const epochMs = Number.isFinite(numeric) ? (numeric < 10_000_000_000 ? numeric * 1000 : numeric) : Date.parse(String(point.t));
      const date = new Date(epochMs);
      const label = Number.isNaN(date.getTime())
        ? String(point.t)
        : range === 1
          ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
          : date.toLocaleDateString([], { month: "short", day: "numeric" });
      return { value: Number(point.p), label };
    });

  if (stage === "processing") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space.x4, padding: space.x6, backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.brand} accessibilityLabel="Submitting paper prediction order" />
        <Text accessibilityLiveRegion="polite" style={{ color: colors.textPrimary, fontSize: 17, fontWeight: font.semibold }}>Submitting paper order…</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "center" }}>{isBuy ? "Buying" : "Selling"} {outcome.toUpperCase()} shares with simulated funds</Text>
      </View>
    );
  }

  if (stage === "receipt") {
    return (
      <PredictionReceiptScreen
        result={lastResult}
        market={market}
        outcome={outcome}
        message={message}
        goPortfolio={goPortfolio}
        backToMarket={() => setStage("configure")}
      />
    );
  }

  if (stage === "review") {
    return (
      <PredictionReviewScreen
        market={market}
        outcome={outcome}
        mode={mode}
        price={price}
        amount={parsedAmount}
        shares={estimatedShares}
        proceeds={proceeds}
        payoutIfCorrect={payoutIfCorrect}
        potentialProfit={potentialProfit}
        busy={busy}
        message={message}
        edit={() => setStage("configure")}
        confirm={submit}
      />
    );
  }

  const canReview = isBuy
    ? Boolean(price > 0 && parsedAmount > 0 && parsedAmount <= cash + 0.005)
    : Boolean(price > 0 && estimatedShares > 0 && estimatedShares <= ownedShares + 0.00001);
  const validationMessage = !isBuy && ownedShares <= 0
    ? "You have no shares of this outcome to sell."
    : parsedAmount <= 0
      ? isBuy ? "Enter a paper dollar amount to continue." : "Enter the number of shares to sell."
      : isBuy && parsedAmount > cash + 0.005
        ? "This stake is above your paper buying power. Lower the amount and review again."
        : !isBuy && estimatedShares > ownedShares + 0.00001
          ? `You can sell up to ${ownedShares.toFixed(2)} shares.`
          : price <= 0
            ? "A live outcome price is required before reviewing this paper order."
            : "Ready for a final simulated-order review.";

  const chartWorkspace = (
    <Surface elevated style={{ flex: isTablet ? 1.45 : undefined, padding: isTablet ? space.x6 : space.x4 }}>
      <View style={{ gap: space.x4 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: space.x4 }}>
          <View style={{ flex: 1, gap: space.x2 }}>
            <Eyebrow>{outcome.toUpperCase()} odds history</Eyebrow>
            <Text style={{ color: colors.textPrimary, fontSize: isTablet ? 40 : 32, fontWeight: font.semibold, fontVariant: ["tabular-nums"] }}>{cents(currentPrice)}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{probability(currentPrice)} implied probability</Text>
          </View>
          <PaperBadge compact />
        </View>

        {historyLoading && !chartPoints.length ? (
          <SkeletonBlock height={isTablet ? 300 : 230} radiusValue={radius.md} />
        ) : (
          <InteractiveLineChart
            testID={`prediction-chart-${market.id}`}
            chartLabel={`${outcome.toUpperCase()} probability`}
            height={isTablet ? 300 : 230}
            points={chartPoints}
            baseline={chartPoints[0]?.value}
            formatValue={(value) => cents(value)}
            compareEnabled={compare}
            onCompareChange={setCompare}
            emptyTitle="Probability history unavailable"
            emptyBody="There is not enough verified odds history to draw this range yet."
          />
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.x2 }}>
          {PREDICTION_RANGES.map(([value, label]) => <FilterChip key={value} label={label} active={range === Number(value)} onPress={() => setRange(Number(value))} />)}
        </ScrollView>
      </View>
    </Surface>
  );

  const ticket = (
    <View style={{ flex: isTablet ? 0.85 : undefined, gap: space.x4 }}>
      <Surface>
        <Eyebrow>Odds</Eyebrow>
        <View style={{ marginTop: space.x3, flexDirection: "row", gap: space.x4 }}>
          <Metric label="Yes" value={`${cents(market.yesPrice)} · ${probability(market.yesPrice)}`} />
          <Metric label="No" value={`${cents(market.noPrice)} · ${probability(market.noPrice)}`} />
        </View>
        <View style={{ marginTop: space.x4, flexDirection: "row", gap: space.x4 }}>
          <Metric label="24h volume" value={compactMoney(market.volume24hr)} />
          <Metric label="Resolves" value={predictionEndLabel(market.endDate)} />
        </View>
      </Surface>

      {position ? (
        <Surface tone={colors.brandSoft}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.x3 }}>
            <Eyebrow>Your position</Eyebrow>
            <Button label="Sell" variant="secondary" icon="minus-circle" onPress={() => setMode("sell")} style={{ minHeight: 36, paddingHorizontal: space.x3 }} />
          </View>
          <View style={{ marginTop: space.x3, flexDirection: "row", gap: space.x4 }}>
            <Metric label={`${outcome.toUpperCase()} shares`} value={ownedShares.toFixed(2)} />
            <Metric label="Avg cost" value={cents(position.avg_cost)} />
          </View>
          <View style={{ marginTop: space.x4, flexDirection: "row", gap: space.x4 }}>
            <Metric label="Market value" value={usd(position.market_value ?? 0)} />
            <Metric label="Return" value={signedUsd(position.unrealized_pl ?? 0)} tone={(position.unrealized_pl ?? 0) >= 0 ? colors.bullish : colors.bearish} />
          </View>
        </Surface>
      ) : null}

      <Surface>
        <Eyebrow>Trade this prediction</Eyebrow>
        <View style={{ marginTop: space.x3, flexDirection: "row", gap: space.x2 }}>
          <PredictionOutcomeCard label="Buy Yes" price={market.yesPrice} tone={colors.brand} active={mode === "buy" && outcome === "yes"} onPress={() => { setOutcome("yes"); setMode("buy"); }} />
          <PredictionOutcomeCard label="Buy No" price={market.noPrice} tone={colors.bearish} active={mode === "buy" && outcome === "no"} onPress={() => { setOutcome("no"); setMode("buy"); }} />
        </View>
        <View style={{ marginTop: space.x3 }}>
          <Segment
            testID="prediction-mode"
            value={mode}
            options={[["buy", "Buy"], ["sell", ownedShares > 0 ? "Sell" : "Sell (none)"]]}
            onChange={(next) => {
              if (next === "sell" && ownedShares <= 0) return;
              setMode(next);
            }}
          />
        </View>
        <View style={{ marginTop: space.x3 }}>
          <Input
            testID="prediction-amount"
            label={isBuy ? "Paper stake (dollars)" : "Shares to sell"}
            helper={isBuy ? "We convert your stake to outcome shares using the live price." : "Sell part or all of your owned outcome shares."}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
            placeholder={isBuy ? "0.00" : "0.00"}
          />
        </View>
        <View style={{ marginTop: space.x2, flexDirection: "row", flexWrap: "wrap", gap: space.x2 }}>
          {isBuy
            ? ["25", "50", "100"].map((preset) => <PresetChip key={preset} label={`$${preset}`} onPress={() => setAmount(preset)} />)
            : null}
          {!isBuy ? <PresetChip label="Max" onPress={() => setAmount(ownedShares > 0 ? ownedShares.toFixed(4) : "")} /> : null}
        </View>

        <View style={{ marginTop: space.x4 }}>
          <Row compact title="Outcome shares you receive" sub={isBuy ? "Stake ÷ live price" : "Shares closed"} right={estimatedShares.toFixed(2)} />
          <Divider />
          {isBuy ? (
            <>
              <Row compact title="Payout if correct" sub="$1.00 per correct share" right={usd(payoutIfCorrect)} />
              <Divider />
              <Row compact title="Potential profit" sub="Payout minus stake" right={signedUsd(potentialProfit)} tone={colors.bullish} />
            </>
          ) : (
            <Row compact title="Estimated proceeds" sub="Shares × live price" right={usd(proceeds)} />
          )}
        </View>

        <View style={{ marginTop: space.x4, gap: space.x3 }}>
          <InlineNotice tone={canReview ? "success" : "warning"} title={canReview ? "Ready to review" : "Review is locked"} body={validationMessage} />
          <Button
            testID="prediction-review"
            label={busy ? "Checking latest details…" : "Review paper order"}
            icon="arrow-right"
            onPress={() => setStage("review")}
            disabled={!canReview || busy}
            disabledReason={validationMessage}
          />
        </View>
      </Surface>

      <Surface>
        <Eyebrow>About this market</Eyebrow>
        <Text style={{ marginTop: space.x2, color: colors.textSecondary, fontSize: 13, lineHeight: 20 }}>
          This paper market uses live public outcome prices as a reference. A correct {outcome.toUpperCase()} share settles at $1.00; an incorrect share settles at $0.00. Vanta never sends real-money orders to a prediction exchange.
        </Text>
      </Surface>
    </View>
  );

  return (
    <View testID={`prediction-${market.id}-ready`} style={{ gap: space.x6 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: space.x3 }}>
        <IconButton icon="chevron-left" label="Back to predictions" onPress={closeMarket} />
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{predictionCategory(market.question, market.category)} · Resolves {predictionEndLabel(market.endDate)}</Text>
        </View>
        <PaperBadge compact />
      </View>

      <Text style={{ color: colors.textPrimary, fontSize: isTablet ? 30 : 24, lineHeight: isTablet ? 36 : 30, fontWeight: font.bold }}>{market.question}</Text>

      <View style={{ flexDirection: isTablet ? "row" : "column", alignItems: "stretch", gap: space.x4 }}>
        {chartWorkspace}
        {ticket}
      </View>
    </View>
  );
}

function PredictionOutcomeCard({ label, price, tone, active, onPress }: { label: string; price: number | null; tone: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${cents(price)}, ${probability(price)} implied`}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 78,
        padding: space.x3,
        borderRadius: radius.md,
        borderWidth: active ? 2 : 1,
        borderColor: active ? tone : colors.border,
        backgroundColor: active ? colors.brandSoft : colors.surface,
        opacity: pressed ? 0.8 : 1,
        gap: space.x1,
      })}
    >
      <Text style={{ color: tone, fontSize: 12, fontWeight: font.bold }}>{label}</Text>
      <Text style={{ color: colors.textPrimary, fontSize: 17, fontWeight: font.bold, fontVariant: ["tabular-nums"] }}>{cents(price)} · {probability(price)}</Text>
      <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Pays $1.00 if correct</Text>
    </Pressable>
  );
}

function PredictionReviewScreen({
  market,
  outcome,
  mode,
  price,
  amount,
  shares,
  proceeds,
  payoutIfCorrect,
  potentialProfit,
  busy,
  message,
  edit,
  confirm,
}: {
  market: PredictionMarket;
  outcome: PredictionOutcome;
  mode: Side;
  price: number;
  amount: number;
  shares: number;
  proceeds: number;
  payoutIfCorrect: number;
  potentialProfit: number;
  busy: boolean;
  message: string;
  edit: () => void;
  confirm: () => void;
}) {
  const { width } = useWindowDimensions();
  const isTablet = width >= layoutBreakpoints.regular;
  const isBuy = mode === "buy";
  return (
    <View testID="screen-prediction-review-ready" style={{ gap: isTablet ? space.x6 : space.x4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.x4 }}>
        <View style={{ flex: 1, gap: isTablet ? space.x2 : space.x1 }}>
          <PaperBadge />
          <Eyebrow>Final check · no real money</Eyebrow>
          <Text style={{ color: colors.textPrimary, fontSize: isTablet ? 40 : 30, lineHeight: isTablet ? 44 : 34, fontWeight: font.bold }}>{isBuy ? `Buy ${outcome.toUpperCase()}` : `Sell ${outcome.toUpperCase()}`}</Text>
        </View>
        <IconButton icon="edit-2" label="Edit order" onPress={edit} />
      </View>

      <View style={{ flexDirection: isTablet ? "row" : "column", alignItems: "stretch", gap: isTablet ? space.x6 : space.x4 }}>
        <Surface elevated style={{ flex: 1.2, padding: isTablet ? space.x8 : space.x4 }}>
          <View style={{ gap: space.x4 }}>
            <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: font.bold }}>{market.question}</Text>
            <View>
              <Row compact title="Outcome" sub={`${cents(price)} each`} right={outcome.toUpperCase()} />
              <Divider />
              <Row compact title={isBuy ? "Paper stake" : "Shares"} sub="Simulated funds only" right={isBuy ? usd(amount) : shares.toFixed(2)} />
              <Divider />
              <Row compact title="Outcome shares" sub="Rounded to two decimals" right={shares.toFixed(2)} />
              <Divider />
              {isBuy ? (
                <>
                  <Row compact title="Payout if correct" sub="$1.00 per correct share" right={usd(payoutIfCorrect)} />
                  <Divider />
                  <Row compact title="Potential profit" sub="Payout minus stake" right={signedUsd(potentialProfit)} tone={colors.bullish} />
                </>
              ) : (
                <Row compact title="Estimated proceeds" sub="Shares × live price" right={usd(proceeds)} />
              )}
            </View>
          </View>
        </Surface>

        <View style={{ flex: 0.8, gap: isTablet ? space.x4 : space.x3 }}>
          <InlineNotice tone="info" title="This is a paper trade" body="Only your simulated portfolio changes—no deposits, withdrawals, payouts, or cash-out." />
          {message ? <InlineNotice tone="error" title="The order was not submitted" body={message} /> : null}
          <Button testID="prediction-confirm" label={busy ? "Submitting paper order…" : isBuy ? `Confirm buy ${outcome.toUpperCase()}` : `Confirm sell ${outcome.toUpperCase()}`} icon="check" onPress={confirm} loading={busy} />
          {isTablet ? <Button label="Edit details" variant="secondary" onPress={edit} disabled={busy} /> : null}
        </View>
      </View>
    </View>
  );
}

function PredictionReceiptScreen({
  result,
  market,
  outcome,
  message,
  goPortfolio,
  backToMarket,
}: {
  result: PredictionTradeResult | null;
  market: PredictionMarket;
  outcome: PredictionOutcome;
  message: string;
  goPortfolio: () => void;
  backToMarket: () => void;
}) {
  const successful = Boolean(result);
  const isBuy = result?.side !== "sell";
  const entrance = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(120),
      Animated.spring(entrance, { toValue: 1, useNativeDriver: true, friction: 6, tension: 60 }),
    ]).start();
  }, [entrance]);
  return (
    <Animated.View
      testID="screen-prediction-receipt-ready"
      style={{
        alignSelf: "center",
        width: "100%",
        maxWidth: 720,
        gap: space.x6,
        opacity: entrance,
        transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }, { scale: entrance.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) }],
      }}
    >
      <Surface elevated style={{ padding: space.x8 }}>
        <View style={{ alignItems: "center", gap: space.x4 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: radius.xl,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: successful ? colors.bullishSoft : colors.bearishSoft,
              transform: [{ scale: entrance.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.4, 1.12, 1] }) }],
            }}
          >
            <Feather name={successful ? "check" : "alert-circle"} size={32} color={successful ? colors.bullish : colors.bearish} />
          </View>
          <PaperBadge />
          <View style={{ alignItems: "center", gap: space.x2 }}>
            <Text style={{ color: colors.textPrimary, fontSize: 30, fontWeight: font.bold, textAlign: "center" }}>{successful ? "Paper order filled" : "Order needs attention"}</Text>
            <Text style={{ maxWidth: 520, color: colors.textSecondary, fontSize: 15, lineHeight: 22, textAlign: "center" }}>{message || "Review the details and try again when a live outcome price is available."}</Text>
          </View>
          {result ? (
            <View style={{ alignSelf: "stretch", marginTop: space.x2 }}>
              <Row title={market.question} sub={`${isBuy ? "Bought" : "Sold"} ${outcome.toUpperCase()} shares`} right="Filled" tone={colors.bullish} />
              <Divider />
              <Row title="Quantity" sub={`${outcome.toUpperCase()} outcome shares`} right={Number(result.shares).toFixed(2)} />
              <Divider />
              <Row title="Fill price" sub="Live paper price" right={cents(result.price)} />
              {isBuy && result.cost != null ? (
                <>
                  <Divider />
                  <Row title="Paper cost" sub="Simulated funds only" right={usd(result.cost)} />
                </>
              ) : null}
              {!isBuy && result.proceeds != null ? (
                <>
                  <Divider />
                  <Row title="Proceeds" sub="Returned to paper cash" right={usd(result.proceeds)} />
                </>
              ) : null}
            </View>
          ) : null}
          <InlineNotice tone="success" title="Learning prompt" body="Note what real-world signal would confirm or invalidate this prediction before it resolves." />
          <View style={{ alignSelf: "stretch", flexDirection: "row", gap: space.x3 }}>
            <Button label="Back to market" variant="secondary" onPress={backToMarket} style={{ flex: 1 }} />
            <Button label="View portfolio" onPress={goPortfolio} style={{ flex: 1 }} />
          </View>
        </View>
      </Surface>
    </Animated.View>
  );
}

export function ProfileScreen({
  me,
  keys,
  newSecret,
  createKey,
  deleteAccount,
  pickAvatar,
  signOut,
  openAdmin,
  themePreference,
  setThemePreference,
  busy,
}: {
  me: Me | null;
  keys: Array<{ id: string; key_id: string; label?: string | null; revoked_at?: string | null }>;
  newSecret: string;
  createKey: () => void;
  deleteAccount: () => void;
  pickAvatar: () => void;
  signOut: () => void;
  openAdmin: () => void;
  themePreference: ThemePreference;
  setThemePreference: (theme: ThemePreference) => void;
  busy: boolean;
}) {
  const { width } = useWindowDimensions();
  const isTablet = width >= layoutBreakpoints.regular;
  const account = me?.account;
  return (
    <View testID="screen-profile-ready" style={{ gap: space.x8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.x4 }}>
        <Avatar uri={me?.profile?.avatar_url} name={account?.display_name ?? "Trader"} size={76} />
        <View style={{ flex: 1 }}>
          <PaperBadge compact />
          <Text style={{ marginTop: space.x2, color: colors.textPrimary, fontSize: 30, fontWeight: font.bold }}>{account?.display_name ?? "Trader"}</Text>
          <Text style={{ marginTop: space.x1, color: colors.textSecondary, fontSize: 14 }}>{me?.user?.email ?? "Signed in"}</Text>
        </View>
        {isTablet ? <Button label="Change photo" variant="secondary" icon="image" onPress={pickAvatar} /> : null}
      </View>
      {!isTablet ? <Button label="Change profile picture" variant="secondary" icon="image" onPress={pickAvatar} /> : null}

      <View style={{ flexDirection: isTablet ? "row" : "column", alignItems: "flex-start", gap: space.x6 }}>
        <View style={{ flex: 1, width: "100%", gap: space.x6 }}>
          <Section title="Account" eyebrow="Practice profile">
            <Surface>
              <Row title="Practice balance" sub="Simulation only" right={usd(account?.cash ?? 0)} icon="credit-card" />
              <Divider />
              <Row title="Risk style" sub="Learning preference" right={me?.profile?.risk_style ?? "Balanced"} icon="shield" />
              <Divider />
              <Row title="Active alerts" sub="Created from Discover" right={String(me?.alerts?.filter((alert) => alert.status === "active").length ?? 0)} icon="bell" />
            </Surface>
          </Section>

          <Section title="Appearance" eyebrow="System, light, dark, midnight">
            <Surface>
              {themeOptions.map((option, index) => {
                const selected = option.value === themePreference;
                return (
                  <View key={option.value}>
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={`${option.label} theme`}
                      testID={`theme-${option.value}`}
                      onPress={() => setThemePreference(option.value)}
                      style={({ pressed }) => ({ minHeight: 58, flexDirection: "row", alignItems: "center", gap: space.x3, opacity: pressed ? 0.7 : 1 })}
                    >
                      <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: selected ? colors.brand : colors.borderStrong, alignItems: "center", justifyContent: "center" }}>
                        {selected ? <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.brand }} /> : null}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: font.semibold }}>{option.label}</Text>
                        <Text style={{ marginTop: space.x1, color: colors.textSecondary, fontSize: 12 }}>{option.description}</Text>
                      </View>
                    </Pressable>
                    {index < themeOptions.length - 1 ? <Divider /> : null}
                  </View>
                );
              })}
            </Surface>
          </Section>
        </View>

        <View style={{ flex: 1, width: "100%", gap: space.x6 }}>
          <Section title="API access" eyebrow="Bots and integrations">
            <Surface>
              <Row title="Generate API key" sub="Secret is shown only once" right="Create" icon="key" onPress={createKey} />
              {newSecret ? (
                <>
                  <Divider />
                  <InlineNotice tone="warning" title="Copy this secret now" body="It will not be displayed again. Keep it private." />
                  <Text selectable style={{ marginTop: space.x3, color: colors.textPrimary, fontSize: 12, lineHeight: 18, fontVariant: ["tabular-nums"] }}>{newSecret}</Text>
                </>
              ) : null}
              {keys.map((key) => (
                <View key={key.id}>
                  <Divider />
                  <Row title={key.label || "Trading bot"} sub={key.key_id} right={key.revoked_at ? "Revoked" : "Active"} icon="terminal" />
                </View>
              ))}
            </Surface>
          </Section>

          {me?.is_admin ? (
            <Section title="Administration">
              <Surface><Row title="Admin console" sub="Accounts, reports, and safety controls" right="Open" icon="shield" onPress={openAdmin} /></Surface>
            </Section>
          ) : null}

          <Section title="Safety and privacy" eyebrow="Your control">
            <Surface>
              <InlineNotice tone="info" title="Educational simulation only" body="PaperAI Trader has no real-money trading, deposits, withdrawals, payouts, prizes, or cash-out." />
              <View style={{ marginTop: space.x4, gap: space.x3 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 21 }}>Deleting your account permanently removes the associated PaperAI Trader profile and activity. This cannot be undone.</Text>
                <Button testID="delete-account" label={busy ? "Working…" : "Delete my account"} variant="danger" disabled={busy} onPress={deleteAccount} />
                <Button label="Sign out" variant="secondary" onPress={signOut} />
              </View>
            </Surface>
          </Section>
        </View>
      </View>
    </View>
  );
}

export function AdminScreen({
  data,
  loading,
  error,
  back,
  runAction,
}: {
  data: AdminData | null;
  loading: boolean;
  error: string;
  back: () => void;
  runAction: (action: string, payload: Record<string, unknown>) => void;
}) {
  return (
    <View style={{ gap: space.x6 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: space.x4 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textPrimary, fontSize: 38, fontWeight: font.bold }}>Admin</Text>
          <Text style={{ marginTop: space.x2, color: colors.textSecondary, fontSize: 14 }}>Private controls for allowlisted accounts</Text>
        </View>
        <IconButton icon="chevron-left" label="Back to profile" onPress={back} />
      </View>
      {loading ? <ActivityIndicator color={colors.brand} /> : null}
      {error ? <InlineNotice tone="error" title="Admin unavailable" body={error} /> : null}
      {data ? (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.x4 }}>
            <Surface style={{ minWidth: 160, flex: 1 }}><Metric label="Users" value={String(data.stats.total_users)} /></Surface>
            <Surface style={{ minWidth: 160, flex: 1 }}><Metric label="Orders" value={String(data.stats.total_orders)} /></Surface>
            <Surface style={{ minWidth: 160, flex: 1 }}><Metric label="Equity" value={usd(data.stats.total_equity, 0)} /></Surface>
            <Surface style={{ minWidth: 160, flex: 1 }}><Metric label="Reports" value={String(data.stats.open_reports)} tone={data.stats.open_reports ? colors.bearish : colors.textPrimary} /></Surface>
          </View>
          <Section title="Accounts">
            <Surface>
              {data.accounts.slice(0, 8).map((account, index) => (
                <View key={account.id}>
                  <Row title={account.display_name} sub={account.email} right={signedPct(account.return_pct ?? 0)} tone={(account.return_pct ?? 0) >= 0 ? colors.bullish : colors.bearish} icon="user" />
                  <View style={{ flexDirection: "row", gap: space.x2, paddingBottom: space.x3 }}>
                    <Button label="Reset" variant="secondary" onPress={() => confirmAdmin("Reset account?", () => runAction("reset", { account_id: account.id }))} />
                    <Button label={account.status === "disabled" ? "Enable" : "Disable"} variant={account.status === "disabled" ? "primary" : "danger"} onPress={() => confirmAdmin("Change account status?", () => runAction(account.status === "disabled" ? "enable" : "disable", { account_id: account.id }))} />
                  </View>
                  {index < Math.min(data.accounts.length, 8) - 1 ? <Divider /> : null}
                </View>
              ))}
            </Surface>
          </Section>
          <Section title="Reports">
            <Surface>
              {data.moderation.reports.length ? data.moderation.reports.slice(0, 8).map((report, index) => (
                <View key={report.id}>
                  <Row title={report.reason || "Message report"} sub={report.direct_messages?.body ?? "Message unavailable"} right={report.status} icon="flag" />
                  <View style={{ flexDirection: "row", gap: space.x2, paddingBottom: space.x3 }}>
                    <Button label="Hide" variant="danger" onPress={() => runAction("hide_message", { message_id: report.message_id })} />
                    <Button label="Dismiss" variant="secondary" onPress={() => runAction("dismiss_report", { report_id: report.id })} />
                  </View>
                  {index < Math.min(data.moderation.reports.length, 8) - 1 ? <Divider /> : null}
                </View>
              )) : <Text style={{ color: colors.textSecondary }}>No reports waiting.</Text>}
            </Surface>
          </Section>
        </>
      ) : null}
    </View>
  );
}

function MiniPrinciple({ icon, title, body }: { icon: keyof typeof Feather.glyphMap; title: string; body: string }) {
  return (
    <View style={{ flex: 1, gap: space.x2 }}>
      <Feather name={icon} size={18} color={colors.brand} />
      <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: font.bold }}>{title}</Text>
      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{body}</Text>
    </View>
  );
}

function ChecklistRow({ icon, title, body, success }: { icon: keyof typeof Feather.glyphMap; title: string; body: string; success?: boolean }) {
  return (
    <View style={{ minHeight: 62, flexDirection: "row", alignItems: "center", gap: space.x3 }}>
      <View style={{ width: 38, height: 38, borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: success ? colors.bullishSoft : colors.surfaceMuted }}>
        <Feather name={icon} size={17} color={success ? colors.bullish : colors.brand} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: font.bold }}>{title}</Text>
        <Text style={{ marginTop: space.x1, color: colors.textSecondary, fontSize: 12, lineHeight: 17 }}>{body}</Text>
      </View>
    </View>
  );
}

function WeeklyReviewCard() {
  return (
    <Surface>
      <Eyebrow>Weekly review</Eyebrow>
      <View style={{ marginTop: space.x3, gap: space.x3 }}>
        <ChecklistRow icon="pie-chart" title="Review allocation" body="Suggested check-in" />
        <ChecklistRow icon="book-open" title="Explain one metric" body="Next healthy habit" />
        <ChecklistRow icon="edit-3" title="Write a trade thesis" body="Reflection over frequency" />
      </View>
    </Surface>
  );
}

function Allocation({ label, value, total, tone }: { label: string; value: number; total: number; tone: string }) {
  const ratio = total > 0 ? value / total : 0;
  const width = `${Math.max(value > 0 ? 4 : 0, Math.min(100, ratio * 100))}%` as `${number}%`;
  return (
    <View accessible accessibilityLabel={`${label}, ${usd(value, 0)}, ${Math.round(ratio * 100)} percent`} style={{ gap: space.x2 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: space.x3 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{label}</Text>
        <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: font.bold, fontVariant: ["tabular-nums"] }}>{usd(value, 0)}</Text>
      </View>
      <View style={{ height: 8, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted }}>
        <View style={{ width, height: 8, borderRadius: radius.pill, backgroundColor: tone }} />
      </View>
    </View>
  );
}

function OrderLine({ order }: { order: Order }) {
  const complete = order.status === "filled";
  return (
    <Row
      title={`${order.side === "buy" ? "Buy" : "Sell"} ${order.symbol}`}
      sub={`${Number(order.qty).toFixed(4)} shares · ${order.type}`}
      right={complete ? "Filled" : order.status.replace(/_/g, " ")}
      tone={order.side === "buy" ? colors.bullish : colors.bearish}
      icon={order.side === "buy" ? "plus-circle" : "minus-circle"}
    />
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 44,
        justifyContent: "center",
        paddingHorizontal: space.x4,
        borderRadius: radius.pill,
        backgroundColor: active ? colors.textPrimary : colors.surface,
        borderWidth: 1,
        borderColor: active ? colors.textPrimary : colors.border,
        opacity: pressed ? 0.72 : 1,
      })}
    >
      <Text style={{ color: active ? colors.background : colors.textSecondary, fontSize: 14, fontWeight: font.bold }}>{label}</Text>
    </Pressable>
  );
}

function PresetChip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Set amount to ${label}`}
      onPress={onPress}
      style={({ pressed }) => ({ minHeight: 44, minWidth: 72, alignItems: "center", justifyContent: "center", paddingHorizontal: space.x3, borderRadius: radius.md, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.7 : 1 })}
    >
      <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: font.bold }}>{label}</Text>
    </Pressable>
  );
}

function confirmAdmin(title: string, onConfirm: () => void) {
  Alert.alert(title, "This admin action changes live account data.", [
    { text: "Cancel", style: "cancel" },
    { text: "Confirm", style: "destructive", onPress: onConfirm },
  ]);
}

function formatOrderTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Recorded";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(parsed);
}

export const screenBottomPadding = navHeight + space.x6;
