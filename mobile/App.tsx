import Constants from "expo-constants";
import { fetch } from "expo/fetch";
import * as SecureStore from "expo-secure-store";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  NativeScrollEvent,
  NativeSyntheticEvent,
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

const c = {
  bg: "#020304",
  card: "#06090b",
  panel: "#0b1013",
  line: "#172027",
  text: "#f3f7f5",
  muted: "#88949d",
  green: "#21e47b",
  red: "#ff5a67",
  blue: "#4aa3ff",
  amber: "#f7c948",
};

type Session = { access_token: string; refresh_token: string; expires_at?: number };
type Tab = "portfolio" | "discover" | "compete" | "settings";
type Account = { id: string; display_name: string; cash: number; equity: number; starting_cash: number; positions_value: number };
type Position = { symbol: string; qty: number; avg_entry_price: number; current_price: number; market_value: number; unrealized_pl: number; unrealized_plpc: number };
type Order = { id: string; symbol: string; qty: number; side: string; type: string; status: string; filled_avg_price?: number; created_at?: string };
type WatchItem = { id?: string; symbol: string; price?: number | null; changePct?: number | null };
type PriceAlert = { id: string; symbol: string; direction: string; target_price?: number | null; move_pct?: number | null; status: string };
type Me = {
  user?: { email?: string };
  account: Account | null;
  positions: Position[];
  orders: Order[];
  watchlist?: WatchItem[];
  alerts?: PriceAlert[];
  unread_messages?: number;
  competition?: { rank: number | null; participants: number; return_pct: number };
  profile?: { bio?: string | null; strategy?: string | null; risk_style?: string | null } | null;
};
type Quote = { symbol: string; price: number; prevClose?: number | null; name?: string | null; change?: number | null; changePercent?: number | null; marketCap?: number | null; volume?: number | null; trailingPE?: number | null; dayHigh?: number | null; dayLow?: number | null };
type Leader = { account_id: string; display_name: string; equity: number; starting_cash: number; return_pct: number };
type Message = { id: string; sender_account_id: string; recipient_account_id: string; body: string; created_at: string };
type ApiKey = { id: string; key_id: string; label?: string | null; revoked_at?: string | null };

const starterSymbols = ["AAPL", "NVDA", "TSLA", "MSFT", "SPY", "QQQ", "AMD", "META"];

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 12000) {
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
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [tab, setTab] = useState<Tab>("portfolio");
  const [me, setMe] = useState<Me | null>(null);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [selectedSymbol, setSelectedSymbol] = useState("NVDA");
  const [tradeSide, setTradeSide] = useState<"buy" | "sell">("buy");
  const [qty, setQty] = useState("1");
  const [messageTarget, setMessageTarget] = useState<Leader | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageBody, setMessageBody] = useState("");
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [newSecret, setNewSecret] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [navCompact, setNavCompact] = useState(false);
  const inFlight = useRef(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    restoreSession();
  }, []);

  useEffect(() => {
    if (!session) return;
    refreshAll(true);
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshAll(false);
    });
    const id = setInterval(() => refreshAll(false), 15000);
    return () => {
      sub.remove();
      clearInterval(id);
    };
  }, [session]);

  useEffect(() => {
    if (messageTarget) loadMessages(messageTarget.account_id);
  }, [messageTarget?.account_id]);

  const selectedQuote = quotes[selectedSymbol];
  const selectedPosition = me?.positions.find((p) => p.symbol === selectedSymbol) ?? null;
  const navOpacity = scrollY.interpolate({ inputRange: [0, 80], outputRange: [1, 0.92], extrapolate: "clamp" });

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const y = event.nativeEvent.contentOffset.y;
    setNavCompact(y > 180);
  }

  async function restoreSession() {
    const stored = await SecureStore.getItemAsync("paper-trader-session").catch(() => null);
    if (stored) setSession(JSON.parse(stored));
    setChecking(false);
  }

  async function saveSession(next: Session | null) {
    setSession(next);
    if (next) await SecureStore.setItemAsync("paper-trader-session", JSON.stringify(next));
    else await SecureStore.deleteItemAsync("paper-trader-session").catch(() => {});
  }

  async function api<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
    const res = await fetchWithTimeout(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        ...(options.headers || {}),
      },
    });
    if (res.status === 401 && retry && session?.refresh_token) {
      const refresh = await fetchWithTimeout(`${API_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: session.refresh_token }),
      });
      if (refresh.ok) {
        const next = (await refresh.json()) as Session;
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

  async function authenticate() {
    setBusy(true);
    setError("");
    try {
      if (authMode === "signup") {
        const signup = await fetchWithTimeout(`${API_URL}/api/auth/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, display_name: displayName }),
        });
        if (!signup.ok) throw new Error((await signup.json()).error || "signup failed");
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
      setError(e instanceof Error ? e.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  async function refreshAll(showSpinner = false) {
    if (inFlight.current || !session) return;
    inFlight.current = true;
    if (showSpinner) setRefreshing(true);
    try {
      const symbols = Array.from(new Set([selectedSymbol, ...starterSymbols, ...(me?.watchlist?.map((w) => w.symbol) ?? [])]));
      const [nextMe, nextLeaders, nextQuotes] = await Promise.all([
        api<Me>("/api/me"),
        api<{ entries: Leader[] }>("/api/leaderboard"),
        api<{ quotes: Quote[] }>(`/api/quotes?symbols=${encodeURIComponent(symbols.join(","))}`),
      ]);
      setMe(nextMe);
      setLeaders(nextLeaders.entries ?? []);
      setQuotes((prev) => ({ ...prev, ...Object.fromEntries((nextQuotes.quotes ?? []).map((q) => [q.symbol.toUpperCase(), q])) }));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not refresh");
    } finally {
      setRefreshing(false);
      inFlight.current = false;
    }
  }

  async function trade() {
    setBusy(true);
    setError("");
    try {
      const order = await api<Order>("/api/trade", {
        method: "POST",
        body: JSON.stringify({ symbol: selectedSymbol, qty: Number(qty), side: tradeSide, type: "market" }),
      });
      Alert.alert("Order submitted", `${order.side.toUpperCase()} ${order.qty} ${order.symbol} is ${order.status}.`);
      await refreshAll(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Trade failed");
    } finally {
      setBusy(false);
    }
  }

  async function addWatch(symbol = selectedSymbol) {
    try {
      await api("/api/watchlists", { method: "POST", body: JSON.stringify({ symbol }) });
      await refreshAll(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Watchlist unavailable");
    }
  }

  async function createAlert(direction: "above" | "below") {
    if (!selectedQuote) return;
    const target = direction === "above" ? selectedQuote.price * 1.03 : selectedQuote.price * 0.97;
    try {
      await api("/api/alerts", { method: "POST", body: JSON.stringify({ symbol: selectedSymbol, direction, target_price: target.toFixed(2) }) });
      await refreshAll(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Alerts unavailable");
    }
  }

  async function loadMessages(accountId: string) {
    try {
      const next = await api<{ messages: Message[] }>(`/api/messages?account_id=${encodeURIComponent(accountId)}`);
      setMessages(next.messages ?? []);
    } catch {
      setMessages([]);
    }
  }

  async function sendMessage() {
    if (!messageTarget || !messageBody.trim()) return;
    try {
      await api("/api/messages", { method: "POST", body: JSON.stringify({ recipient_account_id: messageTarget.account_id, body: messageBody }) });
      setMessageBody("");
      await loadMessages(messageTarget.account_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send message");
    }
  }

  async function reportMessage(messageId: string) {
    try {
      await api("/api/social/report", { method: "POST", body: JSON.stringify({ message_id: messageId, reason: "Reported from mobile" }) });
      Alert.alert("Reported", "Admins can now review this message.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Report failed");
    }
  }

  async function deleteAccount() {
    Alert.alert(
      "Delete account?",
      "This permanently deletes your Paper Trader account, profile, positions, orders, messages, watchlist, and alerts.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete account",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            setError("");
            try {
              await api("/api/account", { method: "DELETE" });
              await saveSession(null);
              setMe(null);
              Alert.alert("Account deleted", "Your Paper Trader account has been deleted.");
            } catch (e) {
              setError(e instanceof Error ? e.message : "Could not delete account");
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  }

  async function createKey() {
    try {
      const key = await api<{ key_id: string; secret: string }>("/api/keys", { method: "POST", body: JSON.stringify({ label: "Mobile app" }) });
      setNewSecret(`${key.key_id}\n${key.secret}`);
      const next = await api<{ keys: ApiKey[] }>("/api/keys");
      setKeys(next.keys ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Key creation failed");
    }
  }

  if (checking) return <Center><ActivityIndicator color={c.green} /></Center>;
  if (!session) {
    return (
      <Center>
        <Text style={brand}>Paper Trader</Text>
        <Text style={subtitle}>A premium paper-trading cockpit for club competitions.</Text>
        <Segment value={authMode} options={[["login", "Sign in"], ["signup", "Sign up"]]} onChange={(v) => setAuthMode(v as "login" | "signup")} />
        {authMode === "signup" && <Input placeholder="Leaderboard name" value={displayName} onChangeText={setDisplayName} />}
        <Input placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Input placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
        {error ? <Banner tone="bad">{error}</Banner> : null}
        <Button label={busy ? "Working..." : authMode === "signup" ? "Create account" : "Sign in"} onPress={authenticate} disabled={busy} />
        <Text style={micro} selectable>{API_URL}</Text>
      </Center>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style="light" />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        scrollEventThrottle={16}
        onScroll={(event) => {
          scrollY.setValue(event.nativeEvent.contentOffset.y);
          handleScroll(event);
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => refreshAll(true)} tintColor={c.green} />}
        contentContainerStyle={{ padding: 18, paddingTop: 56, paddingBottom: 116, gap: 14 }}
      >
        <Header me={me} onSignOut={() => saveSession(null)} />
        {error ? <Banner tone="bad">{error}</Banner> : null}
        {tab === "portfolio" && <Portfolio me={me} leaders={leaders} openSymbol={(symbol) => { setSelectedSymbol(symbol); setTab("discover"); }} />}
        {tab === "discover" && (
          <Discover
            me={me}
            quotes={quotes}
            selectedSymbol={selectedSymbol}
            setSelectedSymbol={setSelectedSymbol}
            quote={selectedQuote}
            position={selectedPosition}
            side={tradeSide}
            setSide={setTradeSide}
            qty={qty}
            setQty={setQty}
            trade={trade}
            busy={busy}
            addWatch={addWatch}
            createAlert={createAlert}
          />
        )}
        {tab === "compete" && (
          <Compete
            me={me}
            leaders={leaders}
            target={messageTarget}
            setTarget={setMessageTarget}
            messages={messages}
            messageBody={messageBody}
            setMessageBody={setMessageBody}
            sendMessage={sendMessage}
            reportMessage={reportMessage}
          />
        )}
        {tab === "settings" && <Settings me={me} keys={keys} newSecret={newSecret} createKey={createKey} deleteAccount={deleteAccount} busy={busy} />}
      </ScrollView>
      <BottomNav tab={tab} setTab={setTab} unread={me?.unread_messages ?? 0} compact={navCompact} opacity={navOpacity} />
    </View>
  );
}

function Header({ me, onSignOut }: { me: Me | null; onSignOut: () => void }) {
  const name = firstName(me?.account?.display_name);
  return (
    <View style={rowBetween}>
      <View>
        <Text style={micro}>{greeting()}, {name || "Trader"}</Text>
        <Text style={screenTitle}>Paper Trader</Text>
      </View>
      <Pressable onPress={onSignOut}><Text style={greenText}>Sign out</Text></Pressable>
    </View>
  );
}

function Portfolio({ me, leaders, openSymbol }: { me: Me | null; leaders: Leader[]; openSymbol: (symbol: string) => void }) {
  const account = me?.account;
  if (!account) return <Card><Text style={muted}>No trading account loaded.</Text></Card>;
  const gain = account.equity - account.starting_cash;
  const gainPct = account.starting_cash > 0 ? (gain / account.starting_cash) * 100 : 0;
  const top = me?.positions.slice().sort((a, b) => Math.abs(b.unrealized_pl) - Math.abs(a.unrealized_pl))[0];
  return (
    <>
      <Panel>
        <Text style={label}>Portfolio</Text>
        <Text style={hero}>{usd(account.equity)}</Text>
        <Text style={[metricGood, gain < 0 && { color: c.red }]}>{signedUsd(gain)} ({signedPct(gainPct)}) all time</Text>
        <Bars values={[18, 26, 24, 36, 44, 41, 56, 62, 59, 74, 81, 78, 92]} />
      </Panel>
      <Grid items={[["Cash", usd(account.cash)], ["Invested", usd(account.positions_value)], ["Rank", rankLabel(me)], ["Unread", String(me?.unread_messages ?? 0)]]} />
      <Section title="Holdings" action="See market">
        {me?.positions.length ? me.positions.map((p) => (
          <Pressable key={p.symbol} onPress={() => openSymbol(p.symbol)}>
            <Line title={p.symbol} sub={`${p.qty} shares`} right={usd(p.market_value)} tone={p.unrealized_pl >= 0 ? c.green : c.red} caption={signedPct(p.unrealized_plpc)} />
          </Pressable>
        )) : <Text style={muted}>No positions yet. Discover a stock to place your first paper trade.</Text>}
      </Section>
      <Section title="Account pulse">
        <Line title="Largest mover" sub={top ? top.symbol : "None yet"} right={top ? signedUsd(top.unrealized_pl) : "--"} tone={(top?.unrealized_pl ?? 0) >= 0 ? c.green : c.red} />
        <Line title="Active alerts" sub="Watching ideas" right={String(me?.alerts?.filter((a) => a.status === "active").length ?? 0)} />
        <Line title="Watchlist" sub="Symbols tracked" right={String(me?.watchlist?.length ?? 0)} />
        <Line title="Simulation mode" sub="Educational only" right="No prizes" tone={c.green} />
      </Section>
      <Section title="Top competition traders">
        {leaders.slice(0, 3).map((l, index) => <Line key={l.account_id} title={`#${index + 1} ${l.display_name}`} sub={usd(l.equity)} right={signedPct(l.return_pct)} tone={l.return_pct >= 0 ? c.green : c.red} />)}
      </Section>
    </>
  );
}

function Discover(props: {
  me: Me | null;
  quotes: Record<string, Quote>;
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;
  quote?: Quote;
  position: Position | null;
  side: "buy" | "sell";
  setSide: (side: "buy" | "sell") => void;
  qty: string;
  setQty: (qty: string) => void;
  trade: () => void;
  busy: boolean;
  addWatch: (symbol?: string) => void;
  createAlert: (direction: "above" | "below") => void;
}) {
  const [search, setSearch] = useState(props.selectedSymbol);
  const symbols = Array.from(new Set([...(props.me?.watchlist?.map((w) => w.symbol) ?? []), ...starterSymbols]));
  return (
    <>
      <Section title="Discover">
        <Input value={search} onChangeText={(v) => setSearch(v.toUpperCase())} placeholder="Search symbol" autoCapitalize="characters" />
        <Button label={`Open ${search || "symbol"}`} variant="ghost" onPress={() => search && props.setSelectedSymbol(search.toUpperCase())} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {symbols.map((symbol) => <Chip key={symbol} active={props.selectedSymbol === symbol} label={symbol} onPress={() => props.setSelectedSymbol(symbol)} />)}
        </View>
      </Section>
      <Panel>
        <Text style={label}>{props.quote?.name || "Stock detail"}</Text>
        <Text style={display}>{props.selectedSymbol}</Text>
        <Text style={[hero, { color: c.green }]}>{props.quote ? usd(props.quote.price) : "--"}</Text>
        <Bars values={[22, 18, 28, 34, 31, 45, 50, 47, 58, 61, 59, 72, 76]} />
        <Grid items={[["High", maybeUsd(props.quote?.dayHigh)], ["Low", maybeUsd(props.quote?.dayLow)], ["Volume", compact(props.quote?.volume)], ["P/E", props.quote?.trailingPE?.toFixed(2) ?? "--"]]} />
      </Panel>
      <Section title="Position and alerts">
        <Line title="Shares" sub="Current holding" right={String(props.position?.qty ?? 0)} />
        <Line title="Market value" sub="Paper position" right={usd(props.position?.market_value ?? 0)} />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button label="Watch" variant="ghost" onPress={() => props.addWatch()} />
          <Button label="Alert +3%" variant="ghost" onPress={() => props.createAlert("above")} />
          <Button label="Alert -3%" variant="danger" onPress={() => props.createAlert("below")} />
        </View>
      </Section>
      <Section title="Trade ticket">
        <Segment value={props.side} options={[["buy", "Buy"], ["sell", "Sell"]]} onChange={(v) => props.setSide(v as "buy" | "sell")} />
        <Input value={props.qty} onChangeText={props.setQty} keyboardType="decimal-pad" placeholder="Shares" />
        <Button label={props.busy ? "Submitting..." : `${props.side === "buy" ? "Buy" : "Sell"} ${props.selectedSymbol}`} variant={props.side === "sell" ? "danger" : "primary"} disabled={props.busy} onPress={props.trade} />
      </Section>
    </>
  );
}

function Compete(props: {
  me: Me | null;
  leaders: Leader[];
  target: Leader | null;
  setTarget: (leader: Leader) => void;
  messages: Message[];
  messageBody: string;
  setMessageBody: (body: string) => void;
  sendMessage: () => void;
  reportMessage: (messageId: string) => void;
}) {
  const target = props.target ?? props.leaders.find((l) => l.account_id !== props.me?.account?.id) ?? null;
  return (
    <>
      <Panel>
        <Text style={label}>Classroom League</Text>
        <Text style={display}>{rankLabel(props.me)}</Text>
        <Text style={muted}>Compare simulated portfolio performance, study top traders, and discuss strategy with classmates.</Text>
      </Panel>
      <Section title="Leaderboard">
        {props.leaders.slice(0, 8).map((l, index) => (
          <Pressable key={l.account_id} onPress={() => props.setTarget(l)}>
            <Line title={`#${index + 1} ${l.display_name}`} sub={usd(l.equity)} right={signedPct(l.return_pct)} tone={l.return_pct >= 0 ? c.green : c.red} />
          </Pressable>
        ))}
      </Section>
      <Section title={target ? `Chat with ${target.display_name}` : "Chat"}>
        {target ? (
          <>
            <View style={{ gap: 8, maxHeight: 260 }}>
              {props.messages.slice(-8).map((m) => {
                const own = m.sender_account_id === props.me?.account?.id;
                return (
                  <View key={m.id} style={{ alignItems: own ? "flex-end" : "flex-start" }}>
                    <Pressable onLongPress={() => !own && props.reportMessage(m.id)} style={[bubble, own ? { backgroundColor: c.green } : { backgroundColor: c.panel }]}>
                      <Text style={{ color: own ? "#001307" : c.text, fontWeight: "700" }}>{m.body}</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
            <Input value={props.messageBody} onChangeText={props.setMessageBody} placeholder="Message..." maxLength={500} />
            <Button label="Send message" onPress={props.sendMessage} />
            <Text style={micro}>Long-press an incoming message to report it for admin review.</Text>
          </>
        ) : <Text style={muted}>No traders yet.</Text>}
      </Section>
    </>
  );
}

function Settings({ me, keys, newSecret, createKey, deleteAccount, busy }: { me: Me | null; keys: ApiKey[]; newSecret: string; createKey: () => void; deleteAccount: () => void; busy: boolean }) {
  return (
    <>
      <Section title="Account">
        <Line title="Name" sub={me?.user?.email ?? ""} right={me?.account?.display_name ?? "--"} />
        <Line title="Practice balance" sub="Simulation only" right={usd(me?.account?.cash ?? 0)} />
        <Line title="Risk style" sub="Profile" right={me?.profile?.risk_style ?? "balanced"} />
      </Section>
      <Section title="Alerts">
        {(me?.alerts ?? []).slice(0, 6).map((a) => <Line key={a.id} title={a.symbol} sub={a.direction} right={a.target_price ? usd(Number(a.target_price)) : `${a.move_pct}%`} />)}
        {(me?.alerts ?? []).length === 0 && <Text style={muted}>Create alerts from Discover.</Text>}
      </Section>
      <Section title="API keys">
        <Button label="Generate key" onPress={createKey} />
        {newSecret ? <Banner tone="good">{newSecret}</Banner> : null}
        {keys.map((k) => <Line key={k.id} title={k.label || "Trading bot"} sub={k.key_id} right={k.revoked_at ? "Revoked" : "Active"} />)}
      </Section>
      <Section title="Safety">
        <Text style={muted}>Paper Trader is educational. There is no real-money trading, gambling, betting, prizes, deposits, or withdrawals. Direct messages can be reported for admin review.</Text>
      </Section>
      <Section title="Account deletion">
        <Text style={muted}>Permanently delete your account and associated Paper Trader data. This cannot be undone.</Text>
        <Button label={busy ? "Working..." : "Delete my account"} variant="danger" disabled={busy} onPress={deleteAccount} />
      </Section>
    </>
  );
}

function BottomNav({ tab, setTab, unread, compact, opacity }: { tab: Tab; setTab: (tab: Tab) => void; unread: number; compact: boolean; opacity: Animated.AnimatedInterpolation<string | number> }) {
  const items: Array<[Tab, string, string]> = [["portfolio", "PF", "Portfolio"], ["discover", "SR", "Discover"], ["compete", "CP", "Compete"], ["settings", "ST", "Settings"]];
  return (
    <Animated.View style={[compact ? navCompactStyle : nav, { opacity }]}>
      {items.map(([key, icon, labelText]) => (
        <Pressable key={key} onPress={() => setTab(key)} style={[compact ? navDot : navItem, tab === key && { backgroundColor: c.green }]}>
          <Text style={{ color: tab === key ? "#001307" : c.text, fontWeight: "900", fontSize: compact ? 10 : 11 }}>{compact ? icon : labelText}{!compact && key === "compete" && unread ? ` ${unread}` : ""}</Text>
        </Pressable>
      ))}
    </Animated.View>
  );
}

function Center({ children }: { children: ReactNode }) {
  return <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ flexGrow: 1, justifyContent: "center", gap: 14, padding: 22, backgroundColor: c.bg }}><StatusBar style="light" />{children}</ScrollView>;
}

function Panel({ children }: { children: ReactNode }) {
  return <View style={panel}>{children}</View>;
}

function Card({ children }: { children: ReactNode }) {
  return <View style={card}>{children}</View>;
}

function Section({ title, action, children }: { title: string; action?: string; children: ReactNode }) {
  return <Card><View style={rowBetween}><Text style={sectionTitle}>{title}</Text>{action ? <Text style={greenText}>{action}</Text> : null}</View>{children}</Card>;
}

function Grid({ items }: { items: Array<[string, string]> }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>{items.map(([k, v]) => <View key={k} style={tile}><Text style={label}>{k}</Text><Text style={tileValue} numberOfLines={1}>{v}</Text></View>)}</View>;
}

function Line({ title, sub, right, tone = c.text, caption }: { title: string; sub?: string; right?: string; tone?: string; caption?: string }) {
  return (
    <View style={line}>
      <View style={{ flex: 1 }}>
        <Text style={lineTitle}>{title}</Text>
        {sub ? <Text style={muted} numberOfLines={1}>{sub}</Text> : null}
      </View>
      <View style={{ alignItems: "flex-end" }}>
        {right ? <Text style={[lineTitle, { color: tone }]}>{right}</Text> : null}
        {caption ? <Text style={[micro, { color: tone }]}>{caption}</Text> : null}
      </View>
    </View>
  );
}

function Input(props: React.ComponentProps<typeof TextInput>) {
  return <TextInput {...props} placeholderTextColor={c.muted} style={input} />;
}

function Button({ label, onPress, disabled, variant = "primary" }: { label: string; onPress: () => void; disabled?: boolean; variant?: "primary" | "ghost" | "danger" }) {
  const backgroundColor = variant === "primary" ? c.green : variant === "danger" ? c.red : c.panel;
  return <Pressable disabled={disabled} onPress={onPress} style={[button, { backgroundColor, opacity: disabled ? 0.45 : 1 }]}><Text style={[buttonText, variant === "primary" && { color: "#001307" }]}>{label}</Text></Pressable>;
}

function Segment({ value, options, onChange }: { value: string; options: Array<[string, string]>; onChange: (value: string) => void }) {
  return <View style={segment}>{options.map(([key, text]) => <Pressable key={key} onPress={() => onChange(key)} style={[segmentItem, value === key && { backgroundColor: c.text }]}><Text style={{ color: value === key ? "#000" : c.text, fontWeight: "900" }}>{text}</Text></Pressable>)}</View>;
}

function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[chip, active && { backgroundColor: c.green, borderColor: c.green }]}><Text style={{ color: active ? "#001307" : c.text, fontWeight: "900" }}>{label}</Text></Pressable>;
}

function Banner({ children, tone }: { children: ReactNode; tone: "bad" | "good" }) {
  return <Text selectable style={[banner, tone === "bad" ? { color: c.red, backgroundColor: "#2a1014" } : { color: c.green, backgroundColor: "#0b2316" }]}>{children}</Text>;
}

function Bars({ values }: { values: number[] }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  return <View style={bars}>{values.map((v, i) => <View key={i} style={{ flex: 1, height: 18 + ((v - min) / Math.max(max - min, 1)) * 92, backgroundColor: c.green, borderRadius: 999, opacity: 0.82 }} />)}</View>;
}

function firstName(name?: string) {
  return name?.trim().split(/\s+/)[0] ?? "";
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function rankLabel(me?: Me | null) {
  if (!me?.competition?.rank) return "Unranked";
  return `#${me.competition.rank} of ${me.competition.participants}`;
}

function usd(value?: number | null) {
  return `$${Number(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function maybeUsd(value?: number | null) {
  return value == null ? "--" : usd(value);
}

function signedUsd(value?: number | null) {
  if (value == null) return "--";
  return `${value >= 0 ? "+" : "-"}${usd(Math.abs(value))}`;
}

function signedPct(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "--";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function compact(value?: number | null) {
  if (value == null) return "--";
  return Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 2 }).format(value);
}

const brand: TextStyle = { color: c.text, fontSize: 40, fontWeight: "900", letterSpacing: 0 };
const subtitle: TextStyle = { color: c.muted, fontSize: 16, lineHeight: 23 };
const screenTitle: TextStyle = { color: c.text, fontSize: 29, fontWeight: "900", letterSpacing: 0 };
const sectionTitle: TextStyle = { color: c.text, fontSize: 21, fontWeight: "900", letterSpacing: 0 };
const display: TextStyle = { color: c.text, fontSize: 48, fontWeight: "900", letterSpacing: 0 };
const hero: TextStyle = { color: c.text, fontSize: 42, fontWeight: "900", fontVariant: ["tabular-nums"], letterSpacing: 0 };
const label: TextStyle = { color: c.muted, fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0 };
const muted: TextStyle = { color: c.muted, fontSize: 13, lineHeight: 19 };
const micro: TextStyle = { color: c.muted, fontSize: 11 };
const greenText: TextStyle = { color: c.green, fontSize: 13, fontWeight: "900" };
const metricGood: TextStyle = { color: c.green, fontSize: 15, fontWeight: "900" };
const tileValue: TextStyle = { color: c.text, fontSize: 17, fontWeight: "900", fontVariant: ["tabular-nums"] };
const lineTitle: TextStyle = { color: c.text, fontSize: 15, fontWeight: "850" as TextStyle["fontWeight"], fontVariant: ["tabular-nums"] };
const rowBetween = { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "center" as const, gap: 12 };
const panel = { backgroundColor: "#030506", borderColor: c.line, borderBottomWidth: 1, paddingVertical: 18, gap: 14 };
const card = { backgroundColor: c.card, borderColor: c.line, borderTopWidth: 1, borderBottomWidth: 1, borderRadius: 8, padding: 16, gap: 12 };
const tile = { width: "48%" as const, backgroundColor: c.panel, borderColor: c.line, borderWidth: 1, borderRadius: 8, padding: 13, gap: 6 };
const line = { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const, gap: 12, borderBottomColor: c.line, borderBottomWidth: 1, paddingVertical: 10 };
const input = { color: c.text, backgroundColor: "#050708", borderColor: c.line, borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16 };
const button = { borderRadius: 999, paddingVertical: 13, paddingHorizontal: 14, alignItems: "center" as const, justifyContent: "center" as const, flex: 1 };
const buttonText: TextStyle = { color: c.text, fontWeight: "900", fontSize: 13 };
const segment = { flexDirection: "row" as const, backgroundColor: c.panel, borderRadius: 999, padding: 4, gap: 4 };
const segmentItem = { flex: 1, alignItems: "center" as const, paddingVertical: 10, borderRadius: 999 };
const chip = { borderColor: c.line, borderWidth: 1, backgroundColor: c.panel, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 };
const banner: TextStyle = { borderRadius: 8, padding: 12, fontWeight: "800" };
const bars = { height: 138, flexDirection: "row" as const, alignItems: "flex-end" as const, gap: 3, paddingTop: 8 };
const bubble = { maxWidth: "82%" as const, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 };
const nav = { position: "absolute" as const, left: 14, right: 14, bottom: 24, flexDirection: "row" as const, gap: 6, backgroundColor: "#05090cf2", borderColor: "#26333b", borderWidth: 1, borderRadius: 999, padding: 8 };
const navCompactStyle = { position: "absolute" as const, right: 14, bottom: 24, flexDirection: "row" as const, gap: 5, backgroundColor: "#05090cf2", borderColor: "#26333b", borderWidth: 1, borderRadius: 999, padding: 7 };
const navItem = { flex: 1, alignItems: "center" as const, justifyContent: "center" as const, borderRadius: 999, minHeight: 44 };
const navDot = { width: 38, height: 38, alignItems: "center" as const, justifyContent: "center" as const, borderRadius: 999 };
