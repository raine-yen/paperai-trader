import Constants from "expo-constants";
import { fetch } from "expo/fetch";
import * as SecureStore from "expo-secure-store";
import { StatusBar } from "expo-status-bar";
import type { ComponentProps, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TextStyle,
  View,
} from "react-native";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ||
  "http://127.0.0.1:3000";

const colors = {
  bg: "#050607",
  card: "#0c0f12",
  elevated: "#12161a",
  border: "#20262d",
  text: "#eef2f1",
  muted: "#8a949e",
  green: "#00c853",
  red: "#ff5252",
  blue: "#3698ff",
  amber: "#ffb300",
};

type Session = { access_token: string; refresh_token: string; expires_at?: number };
type Tab = "dashboard" | "market" | "trade" | "leaders" | "keys";
type ChartRange = "1d" | "5d" | "1mo" | "3mo" | "6mo" | "1y";
type Account = { display_name: string; cash: number; equity: number; starting_cash: number; positions_value: number };
type Position = { symbol: string; qty: number; avg_entry_price: number; current_price: number; market_value: number; unrealized_pl: number; unrealized_plpc: number };
type Order = { id: string; symbol: string; qty: number; side: string; type: string; status: string; filled_avg_price?: number };
type Me = { account: Account | null; positions: Position[]; orders: Order[]; user?: { email?: string } };
type Quote = {
  symbol: string;
  price: number;
  prevClose?: number | null;
  updatedAt?: string;
  name?: string | null;
  currency?: string | null;
  exchange?: string | null;
  marketCap?: number | null;
  trailingPE?: number | null;
  forwardPE?: number | null;
  epsTrailingTwelveMonths?: number | null;
  volume?: number | null;
  averageVolume?: number | null;
  open?: number | null;
  dayHigh?: number | null;
  dayLow?: number | null;
  yearHigh?: number | null;
  yearLow?: number | null;
  change?: number | null;
  changePercent?: number | null;
};
type ChartBar = { t: string; o: number; h: number; l: number; c: number; v: number };
type Leader = { account_id: string; display_name: string; equity: number; starting_cash: number; return_pct: number };
type ApiKey = { id: string; key_id: string; label?: string; revoked_at?: string | null; created_at: string };

const watchlist = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "GOOGL", "META", "SPY"];
const chartRanges: ChartRange[] = ["1d", "5d", "1mo", "3mo", "6mo", "1y"];
const refreshMsByTab: Record<Tab, number> = {
  dashboard: 12_000,
  market: 6_000,
  trade: 5_000,
  leaders: 20_000,
  keys: 45_000,
};

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 12_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal } as Parameters<typeof fetch>[1]);
  } finally {
    clearTimeout(timeout);
  }
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [signup, setSignup] = useState(false);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [me, setMe] = useState<Me | null>(null);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [keysLoaded, setKeysLoaded] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [chartBars, setChartBars] = useState<ChartBar[]>([]);
  const [chartRange, setChartRange] = useState<ChartRange>("1d");
  const [symbol, setSymbol] = useState("AAPL");
  const [qty, setQty] = useState("1");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [limitPrice, setLimitPrice] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [trading, setTrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const refreshInFlight = useRef(false);

  useEffect(() => {
    restoreSession();
  }, []);

  useEffect(() => {
    if (!session) return;
    refreshForTab(tab, true);
  }, [session]);

  useEffect(() => {
    if (!session) return;
    if (tab === "leaders") void refreshLeaders(true);
    if (tab === "keys" && !keysLoaded) void refreshKeys(true);
    if (tab === "trade") void loadTradeSurface(symbol.toUpperCase(), chartRange, true);
  }, [tab]);

  useEffect(() => {
    if (!session || tab !== "trade") return;
    void loadTradeSurface(symbol.toUpperCase(), chartRange, true);
  }, [symbol, chartRange]);

  useEffect(() => {
    if (!session) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshForTab(tab, false);
    });
    return () => sub.remove();
  }, [session, tab, symbol, chartRange, keysLoaded]);

  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => {
      void refreshForTab(tab, false);
    }, refreshMsByTab[tab]);
    return () => clearInterval(interval);
  }, [session, tab, symbol, chartRange, keysLoaded]);

  const currentSymbol = symbol.toUpperCase();
  const currentQuote = quotes[currentSymbol];
  const ownedQty = useMemo(() => {
    return me?.positions.find((p) => p.symbol === currentSymbol)?.qty ?? 0;
  }, [me, currentSymbol]);

  async function restoreSession() {
    const stored = await SecureStore.getItemAsync("paper-trader-session").catch(() => null);
    if (stored) setSession(JSON.parse(stored));
    setChecking(false);
  }

  async function saveSession(next: Session | null) {
    setSession(next);
    if (next) {
      await SecureStore.setItemAsync("paper-trader-session", JSON.stringify(next));
      return;
    }
    setMe(null);
    setLeaders([]);
    setKeys([]);
    setKeysLoaded(false);
    setQuotes({});
    setChartBars([]);
    setNewSecret(null);
    await SecureStore.deleteItemAsync("paper-trader-session").catch(() => {});
  }

  async function api<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
    const { body, ...rest } = options;
    const request = {
      ...rest,
      ...(body == null ? {} : { body }),
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        ...(options.headers || {}),
      },
    };
    const res = await fetchWithTimeout(`${API_URL}${path}`, request);
    if (res.status === 401 && retry && session?.refresh_token) {
      const refreshed = await fetchWithTimeout(`${API_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: session.refresh_token }),
      });
      if (refreshed.ok) {
        const next = (await refreshed.json()) as Session;
        await saveSession(next);
        return api<T>(path, options, false);
      }
      await saveSession(null);
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  async function auth() {
    setAuthLoading(true);
    setError(null);
    try {
      if (signup) {
        await fetchWithTimeout(`${API_URL}/api/auth/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, display_name: displayName }),
        }).then(async (res) => {
          if (!res.ok) throw new Error((await res.json()).error || "signup failed");
        });
      }
      const res = await fetchWithTimeout(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "login failed");
      await saveSession(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setAuthLoading(false);
    }
  }

  async function runRefresh(task: () => Promise<void>, showSpinner: boolean) {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    if (showSpinner) setRefreshing(true);
    try {
      await task();
      setLastUpdated(new Date().toISOString());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load data");
    } finally {
      if (showSpinner) setRefreshing(false);
      refreshInFlight.current = false;
    }
  }

  async function refreshDashboard(showSpinner = false) {
    await runRefresh(async () => {
      const [nextMe, nextQuotes] = await Promise.all([
        api<Me>("/api/me"),
        api<{ quotes: Quote[] }>(`/api/quotes?symbols=${encodeURIComponent(watchlist.join(","))}`),
      ]);
      setMe(nextMe);
      setQuotes((prev) => mergeQuotes(prev, nextQuotes.quotes));
    }, showSpinner);
  }

  async function refreshMarket(showSpinner = false) {
    await runRefresh(async () => {
      const nextQuotes = await api<{ quotes: Quote[] }>(`/api/quotes?symbols=${encodeURIComponent(watchlist.join(","))}`);
      setQuotes((prev) => mergeQuotes(prev, nextQuotes.quotes));
    }, showSpinner);
  }

  async function refreshLeaders(showSpinner = false) {
    await runRefresh(async () => {
      const nextLeaders = await api<{ entries: Leader[] }>("/api/leaderboard");
      setLeaders(nextLeaders.entries);
    }, showSpinner);
  }

  async function refreshKeys(showSpinner = false) {
    await runRefresh(async () => {
      const nextKeys = await api<{ keys: ApiKey[] }>("/api/keys");
      setKeys(nextKeys.keys);
      setKeysLoaded(true);
    }, showSpinner);
  }

  async function loadTradeSurface(nextSymbol: string, range: ChartRange, showSpinner = false) {
    await runRefresh(async () => {
      const [nextMe, nextQuote, nextChart] = await Promise.all([
        api<Me>("/api/me"),
        api<Quote>(`/api/quote?symbol=${encodeURIComponent(nextSymbol)}`),
        api<{ bars: ChartBar[] }>(`/api/chart?symbol=${encodeURIComponent(nextSymbol)}&range=${range}`),
      ]);
      setMe(nextMe);
      setQuotes((prev) => ({ ...prev, [nextSymbol]: nextQuote }));
      setChartBars(nextChart.bars);
      if (!limitPrice) setLimitPrice(String(nextQuote.price.toFixed(2)));
    }, showSpinner);
  }

  async function refreshForTab(nextTab: Tab, showSpinner = false) {
    if (nextTab === "dashboard") return refreshDashboard(showSpinner);
    if (nextTab === "market") return refreshMarket(showSpinner);
    if (nextTab === "trade") return loadTradeSurface(currentSymbol, chartRange, showSpinner);
    if (nextTab === "leaders") return refreshLeaders(showSpinner);
    return refreshKeys(showSpinner);
  }

  async function placeTrade() {
    setTrading(true);
    setError(null);
    try {
      const order = await api<Order>("/api/trade", {
        method: "POST",
        body: JSON.stringify({
          symbol: currentSymbol,
          qty: Number(qty),
          side,
          type: orderType,
          limit_price: orderType === "limit" ? Number(limitPrice) : undefined,
        }),
      });
      Alert.alert("Order submitted", `${order.side.toUpperCase()} ${order.qty} ${order.symbol} is ${order.status}.`);
      await loadTradeSurface(currentSymbol, chartRange, false);
      await refreshMarket(false);
      await refreshLeaders(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Trade failed");
    } finally {
      setTrading(false);
    }
  }

  async function createKey() {
    try {
      const key = await api<{ key_id: string; secret: string }>("/api/keys", {
        method: "POST",
        body: JSON.stringify({ label: "Expo mobile" }),
      });
      setNewSecret(`${key.key_id}\n${key.secret}`);
      await refreshKeys(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate key");
    }
  }

  if (checking) return <Shell><ActivityIndicator color={colors.green} /></Shell>;

  if (!session) {
    return (
      <Shell>
        <Text style={title}>Paper Trader</Text>
        <Text style={muted}>Shared web + mobile paper trading account.</Text>
        <Segment value={signup ? "Sign up" : "Log in"} options={["Log in", "Sign up"]} onChange={(v) => setSignup(v === "Sign up")} />
        {signup && <Input placeholder="Display name" value={displayName} onChangeText={setDisplayName} />}
        <Input placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Input placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
        {error && <Text style={bad} selectable>{error}</Text>}
        <Button label={authLoading ? "Working..." : signup ? "Create account" : "Sign in"} onPress={auth} disabled={authLoading} />
        <Text style={tiny} selectable>API: {API_URL}</Text>
      </Shell>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="light" />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => refreshForTab(tab, true)} tintColor={colors.green} />}
        contentContainerStyle={{ padding: 18, gap: 14, paddingTop: 60, paddingBottom: 120 }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={title}>Paper Trader</Text>
            <Text style={tiny}>{lastUpdated ? `Updated ${timeLabel(lastUpdated)}` : "Waiting for first refresh"}</Text>
          </View>
          <Pressable onPress={() => saveSession(null)}><Text style={link}>Sign out</Text></Pressable>
        </View>
        {error && <Text style={bad} selectable>{error}</Text>}
        {tab === "dashboard" && <Dashboard me={me} leaders={leaders.slice(0, 3)} />}
        {tab === "market" && <Market quotes={quotes} open={(s) => { setSymbol(s); setTab("trade"); }} />}
        {tab === "trade" && (
          <Trade
            symbol={symbol}
            setSymbol={(next) => setSymbol(next.toUpperCase())}
            qty={qty}
            setQty={setQty}
            side={side}
            setSide={setSide}
            orderType={orderType}
            setOrderType={setOrderType}
            limitPrice={limitPrice}
            setLimitPrice={setLimitPrice}
            quote={currentQuote}
            chartBars={chartBars}
            chartRange={chartRange}
            setChartRange={setChartRange}
            ownedQty={ownedQty}
            cash={me?.account?.cash ?? 0}
            loadQuote={() => loadTradeSurface(currentSymbol, chartRange, true)}
            submit={placeTrade}
            busy={trading}
          />
        )}
        {tab === "leaders" && <Leaders leaders={leaders} />}
        {tab === "keys" && <Keys keys={keys} createKey={createKey} newSecret={newSecret} />}
      </ScrollView>
      <View style={nav}>
        {(["dashboard", "market", "trade", "leaders", "keys"] as Tab[]).map((item) => (
          <Pressable key={item} onPress={() => setTab(item)} style={[navItem, tab === item && { backgroundColor: colors.green }]}>
            <Text style={{ color: tab === item ? "#000" : colors.text, fontWeight: "800", fontSize: 12 }}>{item}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Dashboard({ me, leaders }: { me: Me | null; leaders: Leader[] }) {
  const account = me?.account;
  if (!account) return <Card><Text style={muted}>No account loaded.</Text></Card>;
  const ret = account.equity - account.starting_cash;
  const isUp = ret >= 0;
  return (
    <>
      <Card>
        <Text style={label}>Portfolio</Text>
        <Text style={hero}>{usd(account.equity)}</Text>
        <Text style={{ color: isUp ? colors.green : colors.red, fontWeight: "800" }}>{usd(ret)} all time</Text>
      </Card>
      <Grid items={[
        ["Cash", usd(account.cash)],
        ["Invested", usd(account.positions_value)],
        ["Holdings", String(me?.positions.length ?? 0)],
        ["Trader", account.display_name],
      ]} />
      <Section title="Holdings">
        {me?.positions.length ? me.positions.map((p) => (
          <Row
            key={p.symbol}
            left={p.symbol}
            sub={`${p.qty} shares`}
            right={`${usd(p.market_value)}  ${signedPct(p.unrealized_plpc * 100)}`}
            tone={p.unrealized_pl >= 0 ? colors.green : colors.red}
          />
        )) : <Text style={muted}>No positions yet.</Text>}
      </Section>
      <Section title="Top movers">
        {leaders.length ? leaders.map((l, index) => (
          <Row
            key={l.account_id}
            left={`#${index + 1} ${l.display_name}`}
            sub={usd(l.equity)}
            right={signedPct(l.return_pct)}
            tone={l.return_pct >= 0 ? colors.green : colors.red}
          />
        )) : <Text style={muted}>Leaderboard loading.</Text>}
      </Section>
    </>
  );
}

function Market({ quotes, open }: { quotes: Record<string, Quote>; open: (symbol: string) => void }) {
  return (
    <Section title="Market">
      {watchlist.map((symbol) => {
        const quote = quotes[symbol];
        const change = quote?.changePercent ?? (quote?.prevClose ? ((quote.price - quote.prevClose) / quote.prevClose) * 100 : null);
        return (
          <Pressable key={symbol} onPress={() => open(symbol)}>
            <Row
              left={symbol}
              sub={quote?.name || "Tap to trade"}
              right={quote ? `${usd(quote.price)}  ${signedPct(change)}` : "..."}
              tone={change == null ? colors.text : change >= 0 ? colors.green : colors.red}
            />
          </Pressable>
        );
      })}
    </Section>
  );
}

function Trade(props: {
  symbol: string;
  setSymbol: (v: string) => void;
  qty: string;
  setQty: (v: string) => void;
  side: "buy" | "sell";
  setSide: (v: "buy" | "sell") => void;
  orderType: "market" | "limit";
  setOrderType: (v: "market" | "limit") => void;
  limitPrice: string;
  setLimitPrice: (v: string) => void;
  quote?: Quote;
  chartBars: ChartBar[];
  chartRange: ChartRange;
  setChartRange: (v: ChartRange) => void;
  ownedQty: number;
  cash: number;
  loadQuote: () => void;
  submit: () => void;
  busy: boolean;
}) {
  const change = props.quote?.change ?? (props.quote?.prevClose ? props.quote.price - props.quote.prevClose : null);
  const changePct = props.quote?.changePercent ?? (props.quote?.prevClose ? ((props.quote.price - props.quote.prevClose) / props.quote.prevClose) * 100 : null);
  const up = (change ?? 0) >= 0;

  return (
    <>
      <Card>
        <Text style={label}>Order ticket</Text>
        <Input placeholder="Symbol" value={props.symbol} onChangeText={props.setSymbol} autoCapitalize="characters" />
        <Button label="Refresh quote" onPress={props.loadQuote} variant="ghost" />
        <Text style={hero}>{props.quote ? usd(props.quote.price) : "--"}</Text>
        <Text style={{ color: change == null ? colors.muted : up ? colors.green : colors.red, fontWeight: "800", fontSize: 15 }}>
          {change == null ? "Waiting for live quote" : `${signedUsd(change)} (${signedPct(changePct)})`}
        </Text>
        <Text style={tiny}>{props.quote?.exchange || "Live market data"}{props.quote?.updatedAt ? `  •  ${timeLabel(props.quote.updatedAt)}` : ""}</Text>
        <Segment value={props.side} options={["buy", "sell"]} onChange={(v) => props.setSide(v as "buy" | "sell")} />
        <Segment value={props.orderType} options={["market", "limit"]} onChange={(v) => props.setOrderType(v as "market" | "limit")} />
        <Input placeholder="Quantity" value={props.qty} onChangeText={props.setQty} keyboardType="decimal-pad" />
        {props.orderType === "limit" && <Input placeholder="Limit price" value={props.limitPrice} onChangeText={props.setLimitPrice} keyboardType="decimal-pad" />}
        <Text style={muted}>Cash {usd(props.cash)} | Owned {props.ownedQty}</Text>
        <Button label={props.busy ? "Submitting..." : `${props.side.toUpperCase()} ${props.symbol.toUpperCase()}`} onPress={props.submit} variant={props.side === "sell" ? "danger" : "primary"} disabled={props.busy} />
      </Card>

      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: "900" }}>Chart</Text>
          <SegmentCompact value={props.chartRange} options={chartRanges} onChange={(value) => props.setChartRange(value as ChartRange)} />
        </View>
        <MiniChart bars={props.chartBars} positive={up} />
      </Card>

      <Grid items={[
        ["Market Cap", compactNumber(props.quote?.marketCap)],
        ["P/E", formatMetric(props.quote?.trailingPE, 2)],
        ["Forward P/E", formatMetric(props.quote?.forwardPE, 2)],
        ["EPS", props.quote?.epsTrailingTwelveMonths == null ? "--" : usd(props.quote.epsTrailingTwelveMonths)],
        ["Open", props.quote?.open == null ? "--" : usd(props.quote.open)],
        ["Volume", compactNumber(props.quote?.volume)],
        ["Avg Volume", compactNumber(props.quote?.averageVolume)],
        ["52W Range", rangeLabel(props.quote?.yearLow, props.quote?.yearHigh)],
      ]} />
    </>
  );
}

function Leaders({ leaders }: { leaders: Leader[] }) {
  return (
    <Section title="Leaderboard">
      {leaders.map((l, index) => (
        <Row
          key={l.account_id}
          left={`#${index + 1} ${l.display_name}`}
          sub={usd(l.equity)}
          right={signedPct(l.return_pct)}
          tone={l.return_pct >= 0 ? colors.green : colors.red}
        />
      ))}
    </Section>
  );
}

function Keys({ keys, createKey, newSecret }: { keys: ApiKey[]; createKey: () => void; newSecret: string | null }) {
  return (
    <Section title="API keys">
      <Button label="Generate bot key" onPress={createKey} />
      {newSecret && <Text style={good} selectable>{newSecret}</Text>}
      {keys.map((k) => <Row key={k.id} left={k.label || "Trading bot"} sub={k.key_id} right={k.revoked_at ? "Revoked" : "Active"} />)}
    </Section>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 22, gap: 14, backgroundColor: colors.bg }}><StatusBar style="light" />{children}</ScrollView>;
}

function Card({ children }: { children: ReactNode }) {
  return <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 16, gap: 12 }}>{children}</View>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <Card><Text style={{ color: colors.text, fontSize: 20, fontWeight: "900" }}>{title}</Text>{children}</Card>;
}

function Grid({ items }: { items: string[][] }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>{items.map(([k, v]) => <View key={k} style={{ width: "48%", backgroundColor: colors.elevated, borderRadius: 12, padding: 12, gap: 6 }}><Text style={label}>{k}</Text><Text style={value} selectable>{v}</Text></View>)}</View>;
}

function Row({ left, sub, right, tone = colors.text }: { left: string; sub?: string; right?: string; tone?: string }) {
  return <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingVertical: 8 }}><View style={{ flex: 1 }}><Text style={value} selectable>{left}</Text>{sub && <Text style={muted} selectable>{sub}</Text>}</View>{right && <Text style={[value, { color: tone, textAlign: "right" }]} selectable>{right}</Text>}</View>;
}

function Input(props: ComponentProps<typeof TextInput>) {
  return <TextInput {...props} placeholderTextColor={colors.muted} style={{ color: colors.text, backgroundColor: colors.elevated, borderColor: colors.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 }} />;
}

function Button({ label, onPress, disabled, variant = "primary" }: { label: string; onPress: () => void; disabled?: boolean; variant?: "primary" | "ghost" | "danger" }) {
  const bg = variant === "ghost" ? colors.elevated : variant === "danger" ? colors.red : colors.green;
  return <Pressable disabled={disabled} onPress={onPress} style={{ backgroundColor: bg, opacity: disabled ? 0.5 : 1, borderRadius: 12, padding: 14, alignItems: "center" }}><Text style={{ color: variant === "primary" ? "#000" : colors.text, fontWeight: "900" }}>{label}</Text></Pressable>;
}

function Segment({ value, options, onChange }: { value: string; options: string[]; onChange: (value: string) => void }) {
  return <View style={{ flexDirection: "row", backgroundColor: colors.elevated, borderRadius: 12, padding: 4, gap: 4 }}>{options.map((o) => <Pressable key={o} onPress={() => onChange(o)} style={{ flex: 1, padding: 10, borderRadius: 9, backgroundColor: value === o ? colors.text : "transparent" }}><Text style={{ color: value === o ? "#000" : colors.text, textAlign: "center", fontWeight: "800" }}>{o}</Text></Pressable>)}</View>;
}

function SegmentCompact({ value, options, onChange }: { value: string; options: string[]; onChange: (value: string) => void }) {
  return <View style={{ flexDirection: "row", backgroundColor: colors.elevated, borderRadius: 12, padding: 4, gap: 4 }}>{options.map((o) => <Pressable key={o} onPress={() => onChange(o)} style={{ paddingHorizontal: 9, paddingVertical: 8, borderRadius: 8, backgroundColor: value === o ? colors.blue : "transparent" }}><Text style={{ color: colors.text, textAlign: "center", fontWeight: "800", fontSize: 11 }}>{o}</Text></Pressable>)}</View>;
}

function MiniChart({ bars, positive }: { bars: ChartBar[]; positive: boolean }) {
  if (!bars.length) {
    return <View style={{ height: 160, alignItems: "center", justifyContent: "center" }}><Text style={muted}>Chart loading.</Text></View>;
  }

  const sampled = bars.length > 36 ? bars.filter((_, index) => index % Math.ceil(bars.length / 36) === 0) : bars;
  const closes = sampled.map((bar) => bar.c);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const span = Math.max(max - min, 0.0001);
  const tone = positive ? colors.green : colors.red;

  return (
    <View style={{ gap: 10 }}>
      <View style={{ height: 160, justifyContent: "flex-end", flexDirection: "row", gap: 2, alignItems: "flex-end" }}>
        {sampled.map((bar, index) => {
          const height = 14 + ((bar.c - min) / span) * 120;
          return <View key={`${bar.t}-${index}`} style={{ flex: 1, height, backgroundColor: tone, borderRadius: 999, opacity: 0.85 }} />;
        })}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={tiny}>{usd(min)}</Text>
        <Text style={tiny}>{usd(max)}</Text>
      </View>
    </View>
  );
}

function mergeQuotes(prev: Record<string, Quote>, next: Quote[]) {
  const merged = { ...prev };
  for (const quote of next) {
    merged[quote.symbol.toUpperCase()] = {
      ...(merged[quote.symbol.toUpperCase()] || {}),
      ...quote,
    };
  }
  return merged;
}

const usd = (n: number) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const signedUsd = (n: number | null | undefined) => n == null ? "--" : `${n >= 0 ? "+" : "-"}${usd(Math.abs(n))}`;
const signedPct = (n: number | null | undefined) => n == null ? "--" : `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
const compactNumber = (n: number | null | undefined) => n == null ? "--" : Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 2 }).format(n);
const formatMetric = (n: number | null | undefined, digits = 2) => n == null ? "--" : n.toFixed(digits);
const rangeLabel = (low: number | null | undefined, high: number | null | undefined) => low == null || high == null ? "--" : `${usd(low)} - ${usd(high)}`;
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });

const title = { color: colors.text, fontSize: 32, fontWeight: "900" as const };
const hero: TextStyle = { color: colors.text, fontSize: 40, fontWeight: "900", fontVariant: ["tabular-nums"] };
const label = { color: colors.muted, fontSize: 11, fontWeight: "800" as const, textTransform: "uppercase" as const };
const value: TextStyle = { color: colors.text, fontSize: 15, fontWeight: "800", fontVariant: ["tabular-nums"] };
const muted = { color: colors.muted, fontSize: 14 };
const tiny = { color: colors.muted, fontSize: 11 };
const link = { color: colors.green, fontSize: 14, fontWeight: "900" as const };
const bad = { color: colors.red, backgroundColor: "#2b1113", borderRadius: 12, padding: 12, fontWeight: "700" as const };
const good = { color: colors.green, backgroundColor: "#0b2416", borderRadius: 12, padding: 12, fontWeight: "700" as const };
const nav = { position: "absolute" as const, left: 12, right: 12, bottom: 24, flexDirection: "row" as const, gap: 6, backgroundColor: "#090b0dcc", borderRadius: 18, padding: 8, borderColor: colors.border, borderWidth: 1 };
const navItem = { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center" as const };
