import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import { InteractiveLineChart } from "./charts";
import { compactMoney, compactNumber, firstName, greeting, maybeUsd, metric, rangeLabel, signedPct, signedUsd, timeAgo, usd } from "./format";
import { getCompanyName, MARKET_GROUPS } from "./market-data";
import { colors, font, navHeight, radius } from "./theme";
import { Avatar, Button, Divider, IconButton, Input, MarketRow, Metric, Row, Section, Segment, StockLogo, Surface } from "./ui";
import type { AdminData, AmountMode, Bar, DiscoverView, Me, Order, OrderType, Position, Quote, Side } from "./types";

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
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24, gap: 18, backgroundColor: colors.bg }}>
      <View style={{ gap: 12 }}>
        <Text style={{ color: colors.muted, fontSize: 14 }}>Paper Trader</Text>
        <Text style={{ color: colors.text, fontSize: 42, lineHeight: 45, fontWeight: font.bold }}>Practice the market.</Text>
        <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 22 }}>Use the same account as the website. Trades are simulated for learning and have no real-world monetary value.</Text>
      </View>
      <Surface>
        <View style={{ gap: 14 }}>
          <Segment value={mode} options={[["login", "Sign in"], ["signup", "Create"]]} onChange={setMode} />
          {mode === "signup" ? <Input label="Display name" value={displayName} onChangeText={setDisplayName} placeholder="Raine" /> : null}
          <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" />
          <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Password" />
          {error ? <Text selectable style={{ color: colors.red, fontSize: 13, lineHeight: 19 }}>{error}</Text> : null}
          <Button label={busy ? "Working..." : mode === "login" ? "Sign in" : "Create account"} onPress={submit} disabled={busy} />
        </View>
      </Surface>
    </ScrollView>
  );
}

export function PortfolioScreen({
  me,
  quotes,
  openSymbol,
  refreshing,
}: {
  me: Me | null;
  quotes: Record<string, Quote>;
  openSymbol: (symbol: string) => void;
  refreshing: boolean;
}) {
  const [compare, setCompare] = useState(false);
  const account = me?.account;
  if (!account) return <EmptyState title="No trading account" body="Refresh after signing in or contact your club admin." />;

  const gain = Number(account.equity) - Number(account.starting_cash);
  const gainPct = Number(account.starting_cash) > 0 ? (gain / Number(account.starting_cash)) * 100 : 0;
  const snapshots = me?.snapshots?.length ? me.snapshots : fallbackSnapshots(account);
  const allocationBase = Math.max(Number(account.cash) + Number(account.positions_value), 1);
  const largest = me?.positions?.slice().sort((a, b) => Math.abs(Number(b.unrealized_pl)) - Math.abs(Number(a.unrealized_pl)))[0];

  return (
    <View style={{ gap: 28 }}>
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={{ color: colors.muted, fontSize: 14 }}>{greeting()}, {firstName(account.display_name) || "Trader"}</Text>
            <Text style={{ marginTop: 4, color: colors.text, fontSize: 22, fontWeight: font.bold }}>Portfolio</Text>
          </View>
          <Avatar uri={me?.profile?.avatar_url} name={account.display_name} size={44} />
        </View>
        {refreshing ? <Text style={{ color: colors.muted, fontSize: 12 }}>Refreshing market data...</Text> : null}
      </View>

      <View style={{ gap: 14 }}>
        <Text style={{ color: colors.muted, fontSize: 14 }}>Total net worth</Text>
        <Text style={{ color: colors.text, fontSize: 62, lineHeight: 66, fontWeight: font.regular, fontVariant: ["tabular-nums"] }}>{usd(account.equity, 0)}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={{ color: colors.text, fontSize: 20, fontVariant: ["tabular-nums"] }}>{signedUsd(gain)}</Text>
          <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md, backgroundColor: gain >= 0 ? colors.accentSoft : colors.redSoft }}>
            <Text style={{ color: gain >= 0 ? colors.accent : colors.red, fontSize: 18, fontWeight: font.bold, fontVariant: ["tabular-nums"] }}>{signedPct(gainPct)}</Text>
          </View>
        </View>
        <InteractiveLineChart
          height={270}
          points={snapshots.map((s) => ({ value: Number(s.equity), label: new Date(s.created_at).toLocaleDateString([], { month: "short", day: "numeric" }) }))}
          baseline={Number(account.starting_cash)}
          negative={gain < 0}
          formatValue={(value) => usd(value, 0)}
          compareEnabled={compare}
          onCompareChange={setCompare}
        />
      </View>

      <View style={{ flexDirection: "row", gap: 30 }}>
        <Metric label="Practice balance" value={usd(account.cash, 0)} />
        <Metric label="Invested" value={usd(account.positions_value, 0)} />
      </View>
      <Surface>
        <View style={{ gap: 13 }}>
          <Allocation label="Practice balance" value={Number(account.cash)} total={allocationBase} tone={colors.muted} />
          <Allocation label="Positions" value={Number(account.positions_value)} total={allocationBase} tone={colors.accent} />
        </View>
      </Surface>

      <Section title="Holdings" action={<Text style={{ color: colors.accent, fontWeight: font.bold }}>See all</Text>}>
        <View>
          {me.positions.length ? me.positions.slice(0, 5).map((position, index) => (
            <View key={position.symbol}>
              <MarketRow symbol={position.symbol} quote={quotes[position.symbol]} position={position} onPress={() => openSymbol(position.symbol)} />
              {index < Math.min(me.positions.length, 5) - 1 ? <Divider /> : null}
            </View>
          )) : <EmptyState title="No holdings yet" body="Open Discover to place your first paper trade." compact />}
        </View>
      </Section>

      <Section title="Recent activity">
        <View>
          {me.orders.length ? me.orders.slice(0, 5).map((order, index) => (
            <View key={order.id}>
              <OrderLine order={order} />
              {index < Math.min(me.orders.length, 5) - 1 ? <Divider /> : null}
            </View>
          )) : <Text style={{ color: colors.muted }}>No orders yet.</Text>}
        </View>
      </Section>

      <Section title="Account pulse">
        <Surface>
          <Row title="Largest mover" sub={largest ? getCompanyName(largest.symbol) : "None yet"} right={largest ? signedUsd(largest.unrealized_pl) : "--"} tone={(largest?.unrealized_pl ?? 0) >= 0 ? colors.accent : colors.red} icon="activity" />
          <Divider />
          <Row title="Active alerts" sub="Watching your market ideas" right={String(me.alerts?.filter((a) => a.status === "active").length ?? 0)} icon="bell" />
          <Divider />
          <Row title="Watchlist" sub="Tracked symbols" right={String(me.watchlist?.length ?? 0)} icon="eye" />
        </Surface>
      </Section>
    </View>
  );
}

export function DiscoverScreen(props: {
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
  submitOrder: () => void;
  orderBusy: boolean;
  orderMessage: string;
  addWatch: () => void;
  createAlert: (direction: "above" | "below") => void;
}) {
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
}: Parameters<typeof DiscoverScreen>[0]) {
  const [category, setCategory] = useState("Top");
  const owned = me?.positions.map((p) => p.symbol) ?? [];
  const watch = me?.watchlist?.map((w) => w.symbol) ?? [];
  const top = Object.values(quotes)
    .filter((quote): quote is Quote & { symbol: string } => Boolean(quote.symbol))
    .slice()
    .sort((a, b) => Number(b.changePercent ?? 0) - Number(a.changePercent ?? 0))
    .map((q) => q.symbol)
    .slice(0, 10);
  const categories = ["Top", "Owned", "Watchlist", "Popular", "Tech", "Finance", "ETFs", "Consumer"];
  const symbols = category === "Top" ? top : category === "Owned" ? owned : category === "Watchlist" ? watch : MARKET_GROUPS[category] ?? MARKET_GROUPS.Popular;

  function open(symbol: string) {
    setSelectedSymbol(symbol);
    setView("detail");
  }

  return (
    <View style={{ gap: 28 }}>
      <View style={{ gap: 18 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: colors.text, fontSize: 42, lineHeight: 44, fontWeight: font.bold }}>Top daily{"\n"}gainers</Text>
          <IconButton icon="sliders" label="Filter movers" />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {categories.map((cat) => (
            <FilterChip key={cat} label={cat} active={category === cat} onPress={() => setCategory(cat)} />
          ))}
        </ScrollView>
      </View>

      <View style={{ gap: 14 }}>
        <Input
          value={search}
          onChangeText={(value) => setSearch(value.toUpperCase())}
          autoCapitalize="characters"
          placeholder="Search stock or ETF"
        />
        {searchLoading ? <ActivityIndicator color={colors.muted} /> : null}
        {searchResult ? (
          <Surface>
            <MarketRow symbol={searchResult.symbol} quote={searchResult.quote} position={me?.positions.find((p) => p.symbol === searchResult.symbol) ?? null} onPress={() => open(searchResult.symbol)} />
          </Surface>
        ) : null}
      </View>

      <View>
        {symbols.length ? symbols.map((symbol, index) => (
          <View key={symbol}>
            <MarketRow symbol={symbol} quote={quotes[symbol]} position={me?.positions.find((p) => p.symbol === symbol) ?? null} onPress={() => open(symbol)} />
            {index < symbols.length - 1 ? <Divider /> : null}
          </View>
        )) : <EmptyState title="Nothing here yet" body="This list will fill as you add positions or watchlist symbols." compact />}
      </View>
    </View>
  );
}

function StockDetailScreen(props: Parameters<typeof DiscoverScreen>[0]) {
  const {
    selectedSymbol,
    quote,
    position,
    bars,
    chartRange,
    setChartRange,
    setView,
    setSide,
    addWatch,
    createAlert,
  } = props;
  const [compare, setCompare] = useState(false);
  const price = quote?.price ?? 0;
  const change = quote?.change ?? (quote?.prevClose ? price - quote.prevClose : 0);
  const changePct = quote?.changePercent ?? (quote?.prevClose ? (change / quote.prevClose) * 100 : 0);
  const up = change >= 0;
  const chartPoints = bars.length > 1
    ? bars.map((bar) => ({ value: Number(bar.c), label: new Date(bar.t).toLocaleString([], chartRange === "1h" || chartRange === "1d" ? { hour: "2-digit", minute: "2-digit" } : { month: "short", day: "numeric" }) }))
    : fallbackStock(selectedSymbol);

  function openOrder(side: Side) {
    setSide(side);
    setView("order");
  }

  return (
    <View style={{ gap: 22, paddingBottom: 120 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <IconButton icon="chevron-left" label="Back to market" onPress={() => setView("list")} />
        <View style={{ alignItems: "center" }}>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: font.bold }}>{selectedSymbol}</Text>
          <Text style={{ marginTop: 2, color: colors.muted, fontSize: 12 }} numberOfLines={1}>{quote?.name ?? getCompanyName(selectedSymbol)}</Text>
        </View>
        <IconButton icon="bell" label="Create alert" onPress={() => createAlert("above")} />
      </View>

      <View style={{ gap: 9 }}>
        <StockLogo symbol={selectedSymbol} size={58} />
        <Text style={{ color: colors.text, fontSize: 56, lineHeight: 60, fontWeight: font.regular, fontVariant: ["tabular-nums"] }}>{price ? usd(price) : "--"}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={{ color: colors.text, fontSize: 19, fontVariant: ["tabular-nums"] }}>{signedUsd(change)} today</Text>
          <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md, backgroundColor: up ? colors.accentSoft : colors.redSoft }}>
            <Text style={{ color: up ? colors.accent : colors.red, fontSize: 18, fontWeight: font.bold }}>{signedPct(changePct)}</Text>
          </View>
        </View>
      </View>

      <InteractiveLineChart
        height={300}
        points={chartPoints}
        negative={!up}
        baseline={quote?.prevClose ?? chartPoints[0]?.value}
        formatValue={(value) => usd(value)}
        compareEnabled={compare}
        onCompareChange={setCompare}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {chartRanges.map(([range, label]) => <FilterChip key={range} label={label} active={chartRange === range} onPress={() => setChartRange(range)} />)}
      </ScrollView>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <IconButton icon="eye" label="Add to watchlist" onPress={addWatch} />
        <IconButton icon="bell" label="Alert above" onPress={() => createAlert("above")} />
        <IconButton icon="bell-off" label="Alert below" onPress={() => createAlert("below")} danger />
      </View>

      <Section title="Your position">
        <View style={{ flexDirection: "row", gap: 34 }}>
          <Metric label="Quantity" value={position ? Number(position.qty).toFixed(4) : "0"} />
          <Metric label="Value" value={usd(position?.market_value ?? 0, 0)} />
        </View>
      </Section>

      <Section title="Fundamentals">
        <Surface>
          <Row title="P/E ratio" sub="Trailing" right={metric(quote?.trailingPE)} icon="bar-chart-2" />
          <Divider />
          <Row title="Market cap" sub="Current quote" right={compactMoney(quote?.marketCap)} icon="pie-chart" />
          <Divider />
          <Row title="Volume" sub={`Avg ${compactNumber(quote?.averageVolume)}`} right={compactNumber(quote?.volume)} icon="activity" />
          <Divider />
          <Row title="Day range" sub={`Open ${maybeUsd(quote?.open)}`} right={rangeLabel(quote?.dayLow ?? null, quote?.dayHigh ?? null)} icon="maximize-2" />
          <Divider />
          <Row title="52-week range" sub={quote?.updatedAt ? `Updated ${timeAgo(quote.updatedAt)}` : "Latest quote"} right={rangeLabel(quote?.yearLow ?? null, quote?.yearHigh ?? null)} icon="calendar" />
        </Surface>
      </Section>

      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: colors.bg, paddingTop: 18, paddingBottom: 6 }}>
        <View style={{ flexDirection: "row", gap: 14 }}>
          <Button label="Sell" variant="secondary" onPress={() => openOrder("sell")} style={{ flex: 1 }} />
          <Button label="Buy" onPress={() => openOrder("buy")} style={{ flex: 1 }} />
        </View>
      </View>
    </View>
  );
}

function OrderScreen(props: Parameters<typeof DiscoverScreen>[0]) {
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
    submitOrder,
    orderBusy,
    orderMessage,
    setView,
    me,
  } = props;
  const price = orderType === "limit" && Number(limitPrice) > 0 ? Number(limitPrice) : quote?.price ?? 0;
  const cash = Number(me?.account?.cash ?? 0);
  const ownedQty = Number(position?.qty ?? 0);
  const ownedValue = ownedQty * (quote?.price ?? 0);
  const numAmount = Number(amount) || 0;
  const desiredShares = amountMode === "dollars" ? (price > 0 ? numAmount / price : 0) : numAmount;
  const notional = desiredShares * price;
  const sellTooMuch = side === "sell" && desiredShares > ownedQty + 0.00001;
  const buyTooMuch = side === "buy" && notional > cash + 0.01;

  function setMax() {
    if (side === "sell") setAmount(amountMode === "shares" ? ownedQty.toFixed(4) : ownedValue.toFixed(2));
    else setAmount(amountMode === "shares" && price > 0 ? (Math.floor((cash / price) * 10000) / 10000).toFixed(4) : cash.toFixed(2));
  }

  return (
    <View style={{ gap: 22 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View>
          <Text style={{ color: colors.text, fontSize: 42, lineHeight: 46, fontWeight: font.bold }}>{side === "buy" ? "Buy" : "Sell"} {selectedSymbol}</Text>
          <Text style={{ marginTop: 8, color: colors.muted, fontSize: 14 }}>Market and limit paper orders</Text>
        </View>
        <IconButton icon="x" label="Close order" onPress={() => setView("detail")} />
      </View>

      <Segment value={side} options={[["buy", "Buy"], ["sell", "Sell"]]} onChange={setSide} />

      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Segment value={orderType} options={[["market", "Market"], ["limit", "Limit"]]} onChange={setOrderType} />
        </View>
        <View style={{ flex: 1 }}>
          <Segment value={amountMode} options={[["shares", "Shares"], ["dollars", "Dollars"]]} onChange={setAmountMode} />
        </View>
      </View>

      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
          <Text style={{ color: colors.text, fontSize: 60, lineHeight: 66, fontWeight: font.regular }}>{amount || "0"} {amountMode === "shares" ? "shares" : "dollars"}</Text>
        </View>
        <Input keyboardType="decimal-pad" value={amount} onChangeText={setAmount} placeholder={amountMode === "shares" ? "Shares" : "Dollars"} />
        <Button label="Max" variant="secondary" onPress={setMax} />
      </View>

      {orderType === "limit" ? <Input label="Limit price" keyboardType="decimal-pad" value={limitPrice} onChangeText={setLimitPrice} placeholder="0.00" /> : null}

      <Surface>
        <Row title="Estimated price" right={usd(price)} />
        <Divider />
        <Row title={side === "buy" ? "Estimated cost" : "Estimated proceeds"} right={usd(notional)} />
        <Divider />
        <Row title={side === "buy" ? "Buying power after" : "Shares after sale"} right={side === "buy" ? usd(Math.max(0, cash - notional)) : Math.max(0, ownedQty - desiredShares).toFixed(4)} />
      </Surface>

      {(sellTooMuch || buyTooMuch) ? (
        <Text selectable style={{ color: colors.red, fontSize: 14, lineHeight: 20 }}>
          {sellTooMuch ? `You can sell up to ${ownedQty.toFixed(4)} shares.` : "This order is above your buying power."}
        </Text>
      ) : null}
      {orderMessage ? <Text selectable style={{ color: orderMessage.toLowerCase().includes("failed") ? colors.red : colors.accent, textAlign: "center", fontWeight: font.bold }}>{orderMessage}</Text> : null}

      <Button label={orderBusy ? "Submitting..." : "Review paper order"} onPress={submitOrder} disabled={orderBusy || !desiredShares || sellTooMuch || buyTooMuch} variant={side === "sell" ? "danger" : "primary"} />
    </View>
  );
}

export function CompeteScreen() {
  return (
    <View style={{ flex: 1, justifyContent: "center", gap: 22, minHeight: 610 }}>
      <View style={{ width: 74, height: 74, borderRadius: 37, alignItems: "center", justifyContent: "center", backgroundColor: colors.panelAlt }}>
        <Feather name="award" size={30} color={colors.accent} />
      </View>
      <Text style={{ color: colors.text, fontSize: 42, lineHeight: 45, fontWeight: font.bold }}>Competitions{"\n"}coming soon</Text>
      <Text style={{ maxWidth: 310, color: colors.muted, fontSize: 16, lineHeight: 24 }}>This area is blocked off until the future competition plan is ready. Trading, portfolio, and settings stay focused for this build.</Text>
    </View>
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
  busy: boolean;
}) {
  const account = me?.account;
  return (
    <View style={{ gap: 26 }}>
      <View style={{ gap: 14 }}>
        <Avatar uri={me?.profile?.avatar_url} name={account?.display_name ?? "Trader"} size={82} />
        <View>
          <Text style={{ color: colors.text, fontSize: 34, fontWeight: font.bold }}>{account?.display_name ?? "Trader"}</Text>
          <Text style={{ marginTop: 6, color: colors.muted, fontSize: 14 }}>{me?.user?.email ?? "Signed in"}</Text>
        </View>
        <Button label="Change profile picture" variant="secondary" icon="image" onPress={pickAvatar} />
      </View>

      <Section title="Account">
        <Surface>
          <Row title="Practice balance" sub="Simulation only" right={usd(account?.cash ?? 0)} icon="credit-card" />
          <Divider />
          <Row title="Risk style" sub="Profile" right={me?.profile?.risk_style ?? "balanced"} icon="shield" />
          <Divider />
          <Row title="Active alerts" sub="Created from Discover" right={String(me?.alerts?.filter((a) => a.status === "active").length ?? 0)} icon="bell" />
        </Surface>
      </Section>

      <Section title="API keys">
        <Surface>
          <Row title="Generate key" sub="For API/bot access" right="Create" icon="key" onPress={createKey} />
          {newSecret ? (
            <>
              <Divider />
              <Text selectable style={{ color: colors.accent, fontSize: 12, lineHeight: 18 }}>{newSecret}</Text>
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
        <Section title="Admin">
          <Surface>
            <Row title="Admin console" sub="Accounts, reports, and safety controls" right="Open" icon="shield" onPress={openAdmin} />
          </Surface>
        </Section>
      ) : null}

      <Section title="Safety">
        <Surface>
          <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 21 }}>Paper Trader is educational. There is no real-money trading, deposits, withdrawals, payouts, or cash-out. Reports are visible to admins for review.</Text>
        </Surface>
      </Section>

      <Section title="Account deletion">
        <Surface>
          <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 21 }}>Permanently delete your account and associated Paper Trader data. This cannot be undone.</Text>
          <View style={{ marginTop: 14, gap: 10 }}>
            <Button label={busy ? "Working..." : "Delete my account"} variant="danger" disabled={busy} onPress={deleteAccount} />
            <Button label="Sign out" variant="secondary" onPress={signOut} />
          </View>
        </Surface>
      </Section>
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
    <View style={{ gap: 22 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View>
          <Text style={{ color: colors.text, fontSize: 38, fontWeight: font.bold }}>Admin</Text>
          <Text style={{ marginTop: 6, color: colors.muted, fontSize: 14 }}>Private controls for allowlisted accounts</Text>
        </View>
        <IconButton icon="chevron-left" label="Back to profile" onPress={back} />
      </View>
      {loading ? <ActivityIndicator color={colors.accent} /> : null}
      {error ? <Text selectable style={{ color: colors.red }}>{error}</Text> : null}
      {data ? (
        <>
          <View style={{ flexDirection: "row", gap: 18 }}>
            <Metric label="Users" value={String(data.stats.total_users)} />
            <Metric label="Orders" value={String(data.stats.total_orders)} />
          </View>
          <View style={{ flexDirection: "row", gap: 18 }}>
            <Metric label="Equity" value={usd(data.stats.total_equity, 0)} />
            <Metric label="Reports" value={String(data.stats.open_reports)} tone={data.stats.open_reports ? colors.red : colors.text} />
          </View>
          <Section title="Accounts">
            <Surface>
              {data.accounts.slice(0, 8).map((account, index) => (
                <View key={account.id}>
                  <Row title={account.display_name} sub={account.email} right={signedPct(account.return_pct ?? 0)} tone={(account.return_pct ?? 0) >= 0 ? colors.accent : colors.red} icon="user" />
                  <View style={{ flexDirection: "row", gap: 8, paddingBottom: 10 }}>
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
                  <View style={{ flexDirection: "row", gap: 8, paddingBottom: 10 }}>
                    <Button label="Hide" variant="danger" onPress={() => runAction("hide_message", { message_id: report.message_id })} />
                    <Button label="Dismiss" variant="secondary" onPress={() => runAction("dismiss_report", { report_id: report.id })} />
                  </View>
                  {index < Math.min(data.moderation.reports.length, 8) - 1 ? <Divider /> : null}
                </View>
              )) : <Text style={{ color: colors.muted }}>No reports waiting.</Text>}
            </Surface>
          </Section>
        </>
      ) : null}
    </View>
  );
}

function Allocation({ label, value, total, tone }: { label: string; value: number; total: number; tone: string }) {
  const width = `${Math.max(4, Math.min(100, (value / total) * 100))}%` as `${number}%`;
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ color: colors.muted, fontSize: 13 }}>{label}</Text>
        <Text style={{ color: colors.text, fontSize: 13, fontWeight: font.bold }}>{usd(value, 0)}</Text>
      </View>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.panelAlt }}>
        <View style={{ width, height: 8, borderRadius: 4, backgroundColor: tone }} />
      </View>
    </View>
  );
}

function OrderLine({ order }: { order: Order }) {
  const good = order.status === "filled";
  return (
    <Row
      title={`${order.side === "buy" ? "Buy" : "Sell"} ${order.symbol}`}
      sub={`${Number(order.qty).toFixed(4)} shares - ${order.type}`}
      right={good ? "Filled" : order.status.replace(/_/g, " ")}
      tone={order.side === "buy" ? colors.accent : colors.red}
      icon={order.side === "buy" ? "plus-circle" : "minus-circle"}
    />
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 42,
        justifyContent: "center",
        paddingHorizontal: 18,
        borderRadius: radius.md,
        backgroundColor: active ? colors.text : "transparent",
        borderWidth: 1,
        borderColor: active ? "transparent" : colors.line,
        opacity: pressed ? 0.76 : 1,
      })}
    >
      <Text style={{ color: active ? "#050606" : colors.muted, fontSize: 15, fontWeight: font.bold }}>{label}</Text>
    </Pressable>
  );
}

function EmptyState({ title, body, compact }: { title: string; body: string; compact?: boolean }) {
  return (
    <View style={{ minHeight: compact ? 90 : 320, justifyContent: "center", gap: 8 }}>
      <Text style={{ color: colors.text, fontSize: compact ? 18 : 24, fontWeight: font.bold }}>{title}</Text>
      <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 21 }}>{body}</Text>
    </View>
  );
}

function fallbackSnapshots(account: NonNullable<Me["account"]>) {
  const start = Number(account.starting_cash);
  const end = Number(account.equity);
  const values = [start, start * 1.004, start * 1.001, start * 1.012, start * 1.008, end * 0.995, end];
  return values.map((equity, index) => ({ equity, created_at: new Date(Date.now() - (values.length - index) * 86400000).toISOString() }));
}

function fallbackStock(symbol: string) {
  const seed = symbol.charCodeAt(0) % 30;
  return [100, 104, 101, 108, 106, 113, 110, 116, 118, 115, 121, 119].map((value, index) => ({
    value: value + seed,
    label: `Point ${index + 1}`,
  }));
}

function confirmAdmin(title: string, onConfirm: () => void) {
  Alert.alert(title, "This admin action changes live account data.", [
    { text: "Cancel", style: "cancel" },
    { text: "Confirm", style: "destructive", onPress: onConfirm },
  ]);
}

export const screenBottomPadding = navHeight + 28;
