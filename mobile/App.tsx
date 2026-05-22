import Constants from "expo-constants";
import { fetch } from "expo/fetch";
import * as SecureStore from "expo-secure-store";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TextStyle,
  View,
} from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  BriefcaseBusiness,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Eye,
  KeyRound,
  LockKeyhole,
  LogOut,
  Maximize2,
  Moon,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Trophy,
  UserRound,
  Wallet,
  X,
} from "lucide-react-native";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ||
  "http://127.0.0.1:3000";

const SESSION_KEY = "paper-trader-session";
const THEME_KEY = "paper-trader-theme";
const SESSION_REFRESH_WINDOW_SECONDS = 5 * 60;

const darkPalette = {
  scheme: "dark",
  bg: "#050607",
  card: "#07090b",
  elevated: "#0c0f12",
  soft: "#101417",
  border: "#171d22",
  text: "#f2f5f4",
  muted: "#8a9299",
  faint: "#4d565e",
  inverse: "#050607",
  green: "#00d563",
  greenSoft: "rgba(0,213,99,0.13)",
  red: "#ff5252",
  redSoft: "rgba(255,82,82,0.14)",
  blue: "#4aa3ff",
  yellow: "#f4c430",
  white: "#ffffff",
  shadow: "rgba(0,0,0,0.55)",
} as const;

const lightPalette = {
  scheme: "light",
  bg: "#f6f8f7",
  card: "#ffffff",
  elevated: "#eef2f1",
  soft: "#e7ecea",
  border: "#d9e1de",
  text: "#07100c",
  muted: "#65706b",
  faint: "#8d9893",
  inverse: "#ffffff",
  green: "#00a84f",
  greenSoft: "#e4f7ec",
  red: "#d93b45",
  redSoft: "#fde9eb",
  blue: "#1976d2",
  yellow: "#b98600",
  white: "#ffffff",
  shadow: "rgba(20,35,28,0.08)",
} as const;

type ThemeMode = "dark" | "light";
type Palette = {
  scheme: ThemeMode;
  bg: string;
  card: string;
  elevated: string;
  soft: string;
  border: string;
  text: string;
  muted: string;
  faint: string;
  inverse: string;
  green: string;
  greenSoft: string;
  red: string;
  redSoft: string;
  blue: string;
  yellow: string;
  white: string;
  shadow: string;
};
type Session = { ok?: boolean; access_token: string; refresh_token: string; expires_at?: number };
type Tab = "portfolio" | "search" | "competitions" | "settings";
type Side = "buy" | "sell";
type OrderType = "market" | "limit";

type Account = {
  id?: string;
  display_name: string;
  cash: number;
  equity: number;
  starting_cash: number;
  positions_value: number;
};

type Position = {
  symbol: string;
  qty: number;
  avg_entry_price: number;
  current_price: number;
  market_value: number;
  unrealized_pl: number;
  unrealized_plpc: number;
};

type Order = {
  id: string;
  symbol: string;
  qty: number;
  side: Side;
  type: OrderType;
  status: string;
  filled_avg_price?: number | null;
  created_at?: string;
  scheduled_at?: string | null;
};

type Me = {
  user?: { id: string; email?: string };
  account: Account | null;
  positions: Position[];
  orders: Order[];
  snapshots?: Array<{ equity: number; created_at: string }>;
};

type Quote = { symbol: string; price: number; prevClose?: number | null };
type Bar = { t: string; c: number };
type Leader = { account_id: string; display_name: string; equity: number; starting_cash: number; return_pct: number };
type ApiKey = { id: string; key_id: string; label?: string | null; revoked_at?: string | null; created_at: string; last_used_at?: string | null };

type AdminPosition = {
  symbol: string;
  qty: number;
  avg_entry_price: number;
  current_price: number;
  market_value: number;
};

type AdminAccount = {
  id: string;
  email: string;
  display_name: string;
  cash: number;
  equity: number;
  starting_cash: number;
  return_pct: number;
  positions: AdminPosition[];
  position_count: number;
  order_count: number;
  status: string;
};

type AdminData = {
  accounts: AdminAccount[];
  stats: {
    total_users: number;
    total_orders: number;
    total_equity: number;
    avg_return_pct: number;
  };
};

const MARKET_GROUPS: Record<string, string[]> = {
  Popular: ["AAPL", "TSLA", "NVDA", "MSFT", "AMZN", "GOOGL", "META", "SPY", "NFLX", "AMD"],
  Tech: ["AAPL", "MSFT", "NVDA", "AMD", "INTC", "ORCL", "CRM", "SNOW", "PLTR", "UBER"],
  Finance: ["JPM", "BAC", "GS", "MS", "V", "MA", "BRK-B", "WFC", "AXP", "C"],
  ETFs: ["SPY", "QQQ", "VTI", "IWM", "GLD", "TLT", "ARKK", "DIA", "XLK", "XLF"],
};

const COMPANY_NAMES: Record<string, string> = {
  AAPL: "Apple Inc.",
  TSLA: "Tesla Inc.",
  NVDA: "NVIDIA Corp.",
  MSFT: "Microsoft Corp.",
  AMZN: "Amazon.com Inc.",
  GOOGL: "Alphabet Inc.",
  META: "Meta Platforms",
  SPY: "S&P 500 ETF",
  NFLX: "Netflix Inc.",
  AMD: "Advanced Micro Devices",
  INTC: "Intel Corp.",
  ORCL: "Oracle Corp.",
  CRM: "Salesforce",
  SNOW: "Snowflake Inc.",
  PLTR: "Palantir Technologies",
  UBER: "Uber Technologies",
  JPM: "JPMorgan Chase",
  BAC: "Bank of America",
  GS: "Goldman Sachs",
  MS: "Morgan Stanley",
  V: "Visa Inc.",
  MA: "Mastercard Inc.",
  "BRK-B": "Berkshire Hathaway",
  WFC: "Wells Fargo",
  AXP: "American Express",
  C: "Citigroup Inc.",
  QQQ: "Nasdaq 100 ETF",
  VTI: "Vanguard Total Market",
  IWM: "Russell 2000 ETF",
  GLD: "SPDR Gold Shares",
  TLT: "iShares 20+ Year Treasury",
  ARKK: "ARK Innovation ETF",
  DIA: "Dow Jones ETF",
  XLK: "Technology Select SPDR",
  XLF: "Financial Select SPDR",
};

const CHART_RANGES = [
  { label: "1D", value: "1d" },
  { label: "1W", value: "5d" },
  { label: "1M", value: "1mo" },
  { label: "3M", value: "3mo" },
  { label: "1Y", value: "1y" },
] as const;

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
  const [themeMode, setThemeModeState] = useState<ThemeMode>("dark");
  const theme = themeMode === "dark" ? darkPalette : lightPalette;
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [signup, setSignup] = useState(false);
  const [tab, setTab] = useState<Tab>("portfolio");
  const [me, setMe] = useState<Me | null>(null);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [bars, setBars] = useState<Record<string, Bar[]>>({});
  const [chartRange, setChartRange] = useState<(typeof CHART_RANGES)[number]["value"]>("1mo");
  const [selectedSymbol, setSelectedSymbol] = useState("AAPL");
  const [searchQuery, setSearchQuery] = useState("");
  const [qty, setQty] = useState("1");
  const [side, setSide] = useState<Side>("buy");
  const [orderType, setOrderType] = useState<OrderType>("market");
  const [limitPrice, setLimitPrice] = useState("");
  const [apiKeyLabel, setApiKeyLabel] = useState("");
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [adminChecked, setAdminChecked] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminExpanded, setAdminExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const navAnim = useRef(new Animated.Value(1)).current;
  const lastScrollY = useRef(0);
  const expandedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedQuote = quotes[selectedSymbol];
  const ownedPosition = useMemo(
    () => me?.positions.find((p) => p.symbol === selectedSymbol) ?? null,
    [me?.positions, selectedSymbol]
  );
  const isAdmin = !!adminData;

  useEffect(() => {
    restoreTheme();
    restoreSession();
  }, []);

  useEffect(() => {
    if (session) refreshAll();
  }, [session?.access_token]);

  useEffect(() => {
    if (session && tab === "settings" && !adminChecked && !adminLoading) {
      loadAdmin(false);
    }
  }, [tab, session?.access_token, adminChecked, adminLoading]);

  useEffect(() => {
    Animated.spring(navAnim, {
      toValue: navCollapsed ? 0 : 1,
      useNativeDriver: false,
      friction: 9,
      tension: 95,
    }).start();
  }, [navAnim, navCollapsed]);

  async function restoreTheme() {
    const stored = await SecureStore.getItemAsync(THEME_KEY).catch(() => null);
    if (stored === "light" || stored === "dark") setThemeModeState(stored);
  }

  async function setThemeMode(next: ThemeMode) {
    setThemeModeState(next);
    await SecureStore.setItemAsync(THEME_KEY, next).catch(() => {});
  }

  async function restoreSession() {
    const stored = await SecureStore.getItemAsync(SESSION_KEY).catch(() => null);
    if (!stored) {
      setChecking(false);
      return;
    }

    try {
      const parsed = JSON.parse(stored) as Session;
      const fresh = await refreshIfNeeded(parsed, true);
      if (fresh) setSession(fresh);
    } catch {
      await SecureStore.deleteItemAsync(SESSION_KEY).catch(() => {});
    } finally {
      setChecking(false);
    }
  }

  async function saveSession(next: Session | null) {
    setSession(next);
    if (next) {
      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(next), {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
      }).catch(() => {});
    } else {
      await SecureStore.deleteItemAsync(SESSION_KEY).catch(() => {});
      setMe(null);
      setKeys([]);
      setAdminData(null);
      setAdminChecked(false);
    }
  }

  async function refreshSession(refreshToken: string) {
    const refreshed = await fetchWithTimeout(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!refreshed.ok) return null;
    return (await refreshed.json()) as Session;
  }

  async function refreshIfNeeded(current: Session, force = false) {
    const expiresAt = current.expires_at ?? 0;
    const shouldRefresh = force || !expiresAt || expiresAt - Math.floor(Date.now() / 1000) < SESSION_REFRESH_WINDOW_SECONDS;
    if (!shouldRefresh) return current;
    const next = await refreshSession(current.refresh_token);
    if (!next) return current;
    await saveSession(next);
    return next;
  }

  async function api<T>(path: string, options: RequestInit = {}, retry = true, authSession?: Session): Promise<T> {
    const activeSession = authSession ?? session;
    if (!activeSession) throw new Error("Please sign in again.");
    const freshSession = await refreshIfNeeded(activeSession);
    const request = {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${freshSession.access_token}`,
        ...(options.headers || {}),
      },
    };

    const res = await fetchWithTimeout(`${API_URL}${path}`, request);
    if (res.status === 401 && retry) {
      const refreshed = await refreshSession(freshSession.refresh_token);
      if (refreshed) {
        await saveSession(refreshed);
        return api<T>(path, options, false, refreshed);
      }
      await saveSession(null);
      throw new Error("Your session expired. Please sign in again.");
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  async function auth() {
    setLoading(true);
    setError(null);
    try {
      if (signup) {
        const signupRes = await fetchWithTimeout(`${API_URL}/api/auth/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, display_name: displayName }),
        });
        if (!signupRes.ok) throw new Error((await signupRes.json()).error || "Signup failed");
      }

      const res = await fetchWithTimeout(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Sign-in failed");
      await saveSession(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function refreshAll() {
    setLoading(true);
    setError(null);
    try {
      const [nextMe, nextLeaders, nextKeys] = await Promise.all([
        api<Me>("/api/me"),
        api<{ entries: Leader[] }>("/api/leaderboard"),
        api<{ keys: ApiKey[] }>("/api/keys"),
      ]);
      setMe(nextMe);
      setLeaders(nextLeaders.entries ?? []);
      setKeys(nextKeys.keys ?? []);
      await Promise.all(MARKET_GROUPS.Popular.slice(0, 8).map((sym) => loadQuote(sym)));
      await openStock(selectedSymbol, false);
      if (adminData) await loadAdmin(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load data");
    } finally {
      setLoading(false);
    }
  }

  async function loadQuote(sym: string) {
    const clean = sym.trim().toUpperCase();
    if (!clean) return null;
    const quote = await api<Quote>(`/api/quote?symbol=${encodeURIComponent(clean)}`);
    setQuotes((prev) => ({ ...prev, [clean]: { ...quote, symbol: clean } }));
    if (clean === selectedSymbol && !limitPrice) setLimitPrice(Number(quote.price).toFixed(2));
    return { ...quote, symbol: clean };
  }

  async function loadChart(sym: string, range = chartRange) {
    const clean = sym.trim().toUpperCase();
    if (!clean) return;
    const res = await api<{ bars: Bar[] }>(`/api/chart?symbol=${encodeURIComponent(clean)}&range=${encodeURIComponent(range)}`);
    setBars((prev) => ({ ...prev, [clean]: res.bars ?? [] }));
  }

  async function openStock(sym: string, switchTab = true, range = chartRange) {
    const clean = sym.trim().toUpperCase();
    if (!clean) return;
    setSelectedSymbol(clean);
    setSearchQuery("");
    if (switchTab) setTab("search");
    const quote = await loadQuote(clean).catch(() => null);
    if (quote) setLimitPrice(Number(quote.price).toFixed(2));
    await loadChart(clean, range).catch(() => {});
  }

  async function changeChartRange(range: (typeof CHART_RANGES)[number]["value"]) {
    setChartRange(range);
    await loadChart(selectedSymbol, range).catch(() => {});
  }

  async function searchForSymbol() {
    const clean = searchQuery.trim().toUpperCase();
    if (!clean) return;
    setLoading(true);
    setError(null);
    try {
      await openStock(clean);
    } catch (e) {
      setError(e instanceof Error ? e.message : `No quote found for ${clean}`);
    } finally {
      setLoading(false);
    }
  }

  async function placeTrade() {
    const cleanSymbol = selectedSymbol.toUpperCase();
    const numericQty = Number(qty);
    if (!numericQty || numericQty <= 0) return;

    setLoading(true);
    setError(null);
    try {
      const order = await api<Order>("/api/trade", {
        method: "POST",
        body: JSON.stringify({
          symbol: cleanSymbol,
          qty: numericQty,
          side,
          type: orderType,
          limit_price: orderType === "limit" ? Number(limitPrice) : undefined,
        }),
      });
      Alert.alert("Order submitted", `${order.side.toUpperCase()} ${order.qty} ${order.symbol} is ${order.status}.`);
      setQty("1");
      await refreshAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Trade failed");
    } finally {
      setLoading(false);
    }
  }

  async function createKey() {
    setLoading(true);
    setError(null);
    try {
      const key = await api<{ key_id: string; secret: string }>("/api/keys", {
        method: "POST",
        body: JSON.stringify({ label: apiKeyLabel || "Mobile trading key" }),
      });
      setNewSecret(`${key.key_id}\n${key.secret}`);
      setApiKeyLabel("");
      const nextKeys = await api<{ keys: ApiKey[] }>("/api/keys");
      setKeys(nextKeys.keys ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create key");
    } finally {
      setLoading(false);
    }
  }

  async function revokeKey(id: string) {
    Alert.alert("Revoke API key?", "Bots using this key will stop trading immediately.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Revoke",
        style: "destructive",
        onPress: async () => {
          await api(`/api/keys/${id}`, { method: "DELETE" });
          const nextKeys = await api<{ keys: ApiKey[] }>("/api/keys");
          setKeys(nextKeys.keys ?? []);
        },
      },
    ]);
  }

  async function loadAdmin(force: boolean) {
    if (adminLoading && !force) return;
    setAdminLoading(true);
    try {
      const data = await api<AdminData>("/api/admin");
      setAdminData(data);
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      if (!message.toLowerCase().includes("forbidden")) setError(message || "Could not load admin tools");
      setAdminData(null);
    } finally {
      setAdminChecked(true);
      setAdminLoading(false);
    }
  }

  async function signOut() {
    await saveSession(null);
    setTab("portfolio");
  }

  function handleAppScroll(y: number) {
    const delta = y - lastScrollY.current;
    lastScrollY.current = y;
    if (y < 40 || delta < -8) {
      setNavCollapsed(false);
      return;
    }
    if (delta > 10 && y > 120) setNavCollapsed(true);
  }

  function temporarilyExpandNav() {
    setNavCollapsed(false);
    if (expandedTimer.current) clearTimeout(expandedTimer.current);
    expandedTimer.current = setTimeout(() => {
      if (lastScrollY.current > 160) setNavCollapsed(true);
    }, 2600);
  }

  if (checking) {
    return (
      <CenterShell theme={theme} themeMode={themeMode}>
        <LogoMark theme={theme} size={64} />
        <ActivityIndicator color={theme.green} />
      </CenterShell>
    );
  }

  if (!session) {
    return (
      <AuthScreen
        theme={theme}
        themeMode={themeMode}
        signup={signup}
        setSignup={setSignup}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        displayName={displayName}
        setDisplayName={setDisplayName}
        error={error}
        loading={loading}
        submit={auth}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar style={themeMode === "dark" ? "light" : "dark"} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        scrollEventThrottle={16}
        onScroll={(event) => handleAppScroll(event.nativeEvent.contentOffset.y)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshAll} tintColor={theme.green} />}
        contentContainerStyle={{ padding: 18, gap: 18, paddingTop: 58, paddingBottom: 112 }}
      >
        {error && <Banner theme={theme} tone="danger" text={error} onDismiss={() => setError(null)} />}

        {tab === "portfolio" && (
          <PortfolioScreen theme={theme} me={me} quotes={quotes} openStock={openStock} refresh={refreshAll} loading={loading} />
        )}
        {tab === "search" && (
          <SearchScreen
            theme={theme}
            me={me}
            quotes={quotes}
            bars={bars[selectedSymbol] ?? []}
            selectedSymbol={selectedSymbol}
            selectedQuote={selectedQuote}
            selectedPosition={ownedPosition}
            chartRange={chartRange}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchForSymbol={searchForSymbol}
            openStock={openStock}
            changeChartRange={changeChartRange}
            qty={qty}
            setQty={setQty}
            side={side}
            setSide={setSide}
            orderType={orderType}
            setOrderType={setOrderType}
            limitPrice={limitPrice}
            setLimitPrice={setLimitPrice}
            cash={me?.account?.cash ?? 0}
            placeTrade={placeTrade}
            loading={loading}
          />
        )}
        {tab === "competitions" && <CompetitionsScreen theme={theme} leaders={leaders} loading={loading} />}
        {tab === "settings" && (
          <SettingsScreen
            theme={theme}
            themeMode={themeMode}
            setThemeMode={setThemeMode}
            me={me}
            keys={keys}
            apiKeyLabel={apiKeyLabel}
            setApiKeyLabel={setApiKeyLabel}
            newSecret={newSecret}
            setNewSecret={setNewSecret}
            createKey={createKey}
            revokeKey={revokeKey}
            adminData={adminData}
            adminChecked={adminChecked}
            adminLoading={adminLoading}
            loadAdmin={() => loadAdmin(true)}
            adminExpanded={adminExpanded}
            setAdminExpanded={setAdminExpanded}
            signOut={signOut}
          />
        )}
      </ScrollView>
      <BottomNav theme={theme} active={tab} setActive={setTab} collapsed={navCollapsed} animation={navAnim} expand={temporarilyExpandNav} />
    </View>
  );
}

function AuthScreen(props: {
  theme: Palette;
  themeMode: ThemeMode;
  signup: boolean;
  setSignup: (value: boolean) => void;
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  displayName: string;
  setDisplayName: (value: string) => void;
  error: string | null;
  loading: boolean;
  submit: () => void;
}) {
  const { theme, themeMode } = props;
  const canSubmit = props.email.includes("@") && props.password.length >= 6 && (!props.signup || props.displayName.trim().length >= 2);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 22, gap: 20, backgroundColor: theme.bg }}
    >
      <StatusBar style={themeMode === "dark" ? "light" : "dark"} />
      <View style={{ alignItems: "center", gap: 14 }}>
        <LogoMark theme={theme} size={66} />
        <View style={{ alignItems: "center", gap: 6 }}>
          <Text style={{ color: theme.text, fontSize: 34, fontWeight: "900", letterSpacing: 0 }}>Paper Trader</Text>
          <Text style={{ color: theme.muted, fontSize: 15, textAlign: "center", lineHeight: 21 }}>
            Practice with real market data, paper capital, and a club leaderboard.
          </Text>
        </View>
      </View>

      <Panel theme={theme} padded>
        <View style={{ gap: 16 }}>
          <Segment
            theme={theme}
            value={props.signup ? "Create" : "Sign in"}
            options={["Sign in", "Create"]}
            onChange={(value) => props.setSignup(value === "Create")}
          />

          {props.signup && (
            <Input theme={theme} placeholder="Display name" value={props.displayName} onChangeText={props.setDisplayName} textContentType="name" />
          )}
          <Input
            theme={theme}
            placeholder="Email"
            value={props.email}
            onChangeText={props.setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <Input
            theme={theme}
            placeholder="Password"
            value={props.password}
            onChangeText={props.setPassword}
            secureTextEntry
            textContentType={props.signup ? "newPassword" : "password"}
          />

          {props.error && <Banner theme={theme} tone="danger" text={props.error} />}

          <Button
            theme={theme}
            label={props.loading ? "Working..." : props.signup ? "Create account" : "Sign in"}
            onPress={props.submit}
            disabled={props.loading || !canSubmit}
          />
        </View>
      </Panel>

      <View style={{ gap: 10 }}>
        <TrustRow theme={theme} icon={LockKeyhole} title="Session saved securely" text="You stay signed in until you choose to sign out." />
        <TrustRow theme={theme} icon={Sparkles} title="Same backend as web" text="Portfolio, trades, keys, and rankings stay in sync." />
        <Text style={{ color: theme.faint, fontSize: 11, textAlign: "center" }} selectable>
          API {API_URL}
        </Text>
      </View>
    </ScrollView>
  );
}

function PortfolioScreen({
  theme,
  me,
  openStock,
  refresh,
  loading,
}: {
  theme: Palette;
  me: Me | null;
  quotes: Record<string, Quote>;
  openStock: (symbol: string) => void;
  refresh: () => void;
  loading: boolean;
}) {
  const account = me?.account;
  const positions = me?.positions ?? [];
  const orders = me?.orders ?? [];
  const snapshots = me?.snapshots ?? [];

  if (!account) {
    return (
      <>
        <ScreenTitle theme={theme} label="Portfolio" title={timeGreeting()} subtitle="Once your trading account is active, holdings and activity appear here." />
        <Panel theme={theme} padded>
          <EmptyState theme={theme} title="No trading account found" text="Ask your club admin to activate your paper account." />
        </Panel>
      </>
    );
  }

  const totalReturn = Number(account.equity) - Number(account.starting_cash);
  const totalReturnPct = Number(account.starting_cash) > 0 ? (totalReturn / Number(account.starting_cash)) * 100 : 0;
  const isUp = totalReturn >= 0;
  const chartValues = snapshots.length > 1 ? snapshots.map((s) => Number(s.equity)) : [Number(account.starting_cash), Number(account.equity)];
  const topHolding = [...positions].sort((a, b) => Number(b.market_value) - Number(a.market_value))[0];

  return (
    <>
      <ScreenTitle
        theme={theme}
        label="Portfolio"
        title={timeGreeting(account.display_name)}
        subtitle="Account home"
        right={
          <IconButton theme={theme} icon={RefreshCw} onPress={refresh} disabled={loading} />
        }
      />

      <Panel theme={theme} padded>
        <View style={{ gap: 18 }}>
          <View style={{ gap: 6 }}>
            <Text style={labelStyle(theme)}>Account value</Text>
            <Text style={heroStyle(theme)} selectable>{usd(account.equity)}</Text>
            <ChangeLine theme={theme} value={totalReturn} pct={totalReturnPct} suffix="all time" />
          </View>
          <SparklineChart theme={theme} values={chartValues} positive={isUp} height={166} />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <MetricTile theme={theme} label="Cash" value={usd(account.cash)} icon={Wallet} />
            <MetricTile theme={theme} label="Invested" value={usd(account.positions_value)} icon={BriefcaseBusiness} />
          </View>
        </View>
      </Panel>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <MetricTile theme={theme} label="Holdings" value={String(positions.length)} icon={BarChart3} />
        <MetricTile
          theme={theme}
          label="Return"
          value={pct(totalReturnPct)}
          icon={Activity}
          tone={isUp ? theme.green : theme.red}
        />
      </View>

      <PortfolioPulse theme={theme} account={account} positions={positions} />

      {topHolding && (
        <Panel theme={theme} padded>
          <View style={{ gap: 12 }}>
            <SectionHeader theme={theme} title="Largest holding" />
            <HoldingRow theme={theme} position={topHolding} onPress={() => openStock(topHolding.symbol)} featured />
          </View>
        </Panel>
      )}

      <Panel theme={theme} padded={false}>
        <SectionHeader theme={theme} title="Holdings" padded action={positions.length ? `${positions.length} open` : undefined} />
        {positions.length ? (
          positions.map((position) => <HoldingRow key={position.symbol} theme={theme} position={position} onPress={() => openStock(position.symbol)} />)
        ) : (
          <EmptyState theme={theme} title="No holdings yet" text="Use Search to find a stock and place your first paper trade." compact />
        )}
      </Panel>

      <Panel theme={theme} padded={false}>
        <SectionHeader theme={theme} title="Recent activity" padded action={orders.length ? `${orders.length} orders` : undefined} />
        {orders.length ? (
          orders.slice(0, 8).map((order) => <OrderRow key={order.id} theme={theme} order={order} />)
        ) : (
          <EmptyState theme={theme} title="No orders yet" text="Trades and limit orders will appear here." compact />
        )}
      </Panel>
    </>
  );
}

function SearchScreen(props: {
  theme: Palette;
  me: Me | null;
  quotes: Record<string, Quote>;
  bars: Bar[];
  selectedSymbol: string;
  selectedQuote?: Quote;
  selectedPosition: Position | null;
  chartRange: (typeof CHART_RANGES)[number]["value"];
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  searchForSymbol: () => void;
  openStock: (symbol: string) => void;
  changeChartRange: (range: (typeof CHART_RANGES)[number]["value"]) => void;
  qty: string;
  setQty: (value: string) => void;
  side: Side;
  setSide: (value: Side) => void;
  orderType: OrderType;
  setOrderType: (value: OrderType) => void;
  limitPrice: string;
  setLimitPrice: (value: string) => void;
  cash: number;
  placeTrade: () => void;
  loading: boolean;
}) {
  const { theme } = props;
  const ownedSymbols = (props.me?.positions ?? []).map((p) => p.symbol);
  const allSymbols = unique([...ownedSymbols, ...Object.values(MARKET_GROUPS).flat()]);
  const query = props.searchQuery.trim().toUpperCase();
  const discovery = (query
    ? allSymbols.filter((sym) => sym.includes(query) || companyName(sym).toUpperCase().includes(query))
    : unique([...ownedSymbols, ...MARKET_GROUPS.Popular])
  ).slice(0, 14);
  const quoteChange = quoteDelta(props.selectedQuote);
  const price = Number(props.selectedQuote?.price ?? 0);
  const qtyNum = Number(props.qty) || 0;
  const notional = qtyNum * price;
  const ownedQty = Number(props.selectedPosition?.qty ?? 0);
  const cannotSell = props.side === "sell" && qtyNum > ownedQty;
  const cannotBuy = props.side === "buy" && notional > props.cash + 0.01;
  const canTrade = !!props.selectedQuote && qtyNum > 0 && !cannotSell && !cannotBuy && !props.loading;

  return (
    <>
      <ScreenTitle theme={theme} label="Search" title="Find stocks" subtitle="Quote, inspect, and trade from one focused surface." />

      <Panel theme={theme} padded>
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: theme.elevated, borderRadius: 12, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 12 }}>
            <Search color={theme.muted} size={19} strokeWidth={2.4} />
            <TextInput
              placeholder="Search ticker or company"
              placeholderTextColor={theme.faint}
              value={props.searchQuery}
              onChangeText={(value) => props.setSearchQuery(value.toUpperCase())}
              onSubmitEditing={props.searchForSymbol}
              autoCapitalize="characters"
              autoCorrect={false}
              style={{ flex: 1, color: theme.text, paddingVertical: 13, fontSize: 16, fontWeight: "700", letterSpacing: 0 }}
            />
            {props.searchQuery ? (
              <Pressable onPress={() => props.setSearchQuery("")} hitSlop={10}>
                <X color={theme.muted} size={17} />
              </Pressable>
            ) : null}
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {discovery.map((sym) => (
              <TickerChip
                key={sym}
                theme={theme}
                symbol={sym}
                owned={ownedSymbols.includes(sym)}
                selected={props.selectedSymbol === sym}
                onPress={() => props.openStock(sym)}
              />
            ))}
          </View>
        </View>
      </Panel>

      <DiscoveryModules theme={theme} ownedSymbols={ownedSymbols} openStock={props.openStock} />

      <Panel theme={theme} padded>
        <View style={{ gap: 18 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: theme.muted, fontSize: 15, fontWeight: "700" }}>{companyName(props.selectedSymbol)}</Text>
              <Text style={{ color: theme.text, fontSize: 44, fontWeight: "900", letterSpacing: 0 }} selectable>{props.selectedSymbol}</Text>
            </View>
            {props.selectedPosition && <Pill theme={theme} text={`${shares(props.selectedPosition.qty)} owned`} tone="green" />}
          </View>

          <View style={{ gap: 4 }}>
            <Text style={heroStyle(theme)} selectable>{props.selectedQuote ? usd(props.selectedQuote.price) : "--"}</Text>
            {quoteChange ? <ChangeLine theme={theme} value={quoteChange.value} pct={quoteChange.pct} suffix="today" /> : <Text style={mutedStyle(theme)}>Quote loading...</Text>}
          </View>

          <View style={{ flexDirection: "row", gap: 8 }}>
            {CHART_RANGES.map((range) => (
              <Pressable
                key={range.value}
                onPress={() => props.changeChartRange(range.value)}
                style={{
                  flex: 1,
                  alignItems: "center",
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: props.chartRange === range.value ? theme.text : theme.elevated,
                }}
              >
                <Text style={{ color: props.chartRange === range.value ? theme.inverse : theme.muted, fontSize: 12, fontWeight: "900" }}>{range.label}</Text>
              </Pressable>
            ))}
          </View>

          <SparklineChart
            theme={theme}
            values={props.bars.length ? props.bars.map((bar) => Number(bar.c)) : [price * 0.985, price, price * 1.006].filter(Boolean)}
            positive={!quoteChange || quoteChange.value >= 0}
            height={154}
          />

          <View style={{ flexDirection: "row", gap: 10 }}>
            <MetricTile theme={theme} label="Buying power" value={usd(props.cash)} icon={CircleDollarSign} />
            <MetricTile theme={theme} label="Position" value={props.selectedPosition ? usd(props.selectedPosition.market_value) : "$0.00"} icon={BriefcaseBusiness} />
          </View>

          {props.selectedPosition && (
            <View style={{ backgroundColor: theme.elevated, borderRadius: 12, borderWidth: 1, borderColor: theme.border, padding: 14, gap: 12 }}>
              <SectionHeader theme={theme} title="Your position" />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <MiniStat theme={theme} label="Shares" value={shares(props.selectedPosition.qty)} />
                <MiniStat theme={theme} label="Avg cost" value={usd(props.selectedPosition.avg_entry_price)} />
              </View>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <MiniStat theme={theme} label="Value" value={usd(props.selectedPosition.market_value)} />
                <MiniStat
                  theme={theme}
                  label="Gain"
                  value={`${usd(props.selectedPosition.unrealized_pl)} ${pct(props.selectedPosition.unrealized_plpc)}`}
                  tone={props.selectedPosition.unrealized_pl >= 0 ? theme.green : theme.red}
                />
              </View>
            </View>
          )}
        </View>
      </Panel>

      <Panel theme={theme} padded>
        <View style={{ gap: 14 }}>
          <SectionHeader theme={theme} title="Trade" action={props.orderType} />
          <Segment theme={theme} value={props.side} options={["buy", "sell"]} onChange={(value) => props.setSide(value as Side)} dangerOption="sell" />
          <Segment theme={theme} value={props.orderType} options={["market", "limit"]} onChange={(value) => props.setOrderType(value as OrderType)} />

          <Input theme={theme} placeholder="Quantity" value={props.qty} onChangeText={props.setQty} keyboardType="decimal-pad" />
          {props.orderType === "limit" && (
            <Input theme={theme} placeholder="Limit price" value={props.limitPrice} onChangeText={props.setLimitPrice} keyboardType="decimal-pad" />
          )}

          {qtyNum > 0 && (
            <View style={{ backgroundColor: theme.elevated, borderRadius: 12, padding: 14, gap: 10 }}>
              <SummaryLine theme={theme} label="Market price" value={props.selectedQuote ? usd(props.selectedQuote.price) : "--"} />
              <SummaryLine theme={theme} label={props.side === "buy" ? "Estimated cost" : "Estimated proceeds"} value={usd(notional)} strong />
              {props.side === "sell" && <SummaryLine theme={theme} label="Shares after sale" value={shares(Math.max(0, ownedQty - qtyNum))} />}
            </View>
          )}

          {(cannotSell || cannotBuy) && (
            <Banner
              theme={theme}
              tone="danger"
              text={cannotSell ? `You can sell up to ${shares(ownedQty)} shares.` : "This order is above your buying power."}
            />
          )}

          <Button
            theme={theme}
            label={`${props.side === "buy" ? "Buy" : "Sell"} ${props.selectedSymbol}`}
            onPress={props.placeTrade}
            disabled={!canTrade}
            tone={props.side === "sell" ? "danger" : "primary"}
          />
        </View>
      </Panel>
    </>
  );
}

function PortfolioPulse({ theme, account, positions }: { theme: Palette; account: Account; positions: Position[] }) {
  const equity = Math.max(Number(account.equity) || 0, 1);
  const cashPct = (Number(account.cash) / equity) * 100;
  const largest = [...positions].sort((a, b) => Number(b.market_value) - Number(a.market_value))[0];
  const concentrationPct = largest ? (Number(largest.market_value) / equity) * 100 : 0;
  const biggestMover = [...positions].sort((a, b) => Math.abs(Number(b.unrealized_pl)) - Math.abs(Number(a.unrealized_pl)))[0];
  const diversificationScore = Math.max(0, Math.min(100, positions.length * 14 - Math.max(0, concentrationPct - 28)));

  return (
    <Panel theme={theme} padded>
      <View style={{ gap: 14 }}>
        <SectionHeader theme={theme} title="Account pulse" action="Live scan" />
        <PulseLine
          theme={theme}
          icon={Wallet}
          title="Cash buffer"
          value={`${cashPct.toFixed(1)}%`}
          text={cashPct > 20 ? "Plenty of buying power for new ideas." : "Most capital is deployed in positions."}
        />
        <PulseLine
          theme={theme}
          icon={Maximize2}
          title="Concentration"
          value={largest ? `${largest.symbol} ${concentrationPct.toFixed(1)}%` : "No positions"}
          text={concentrationPct > 35 ? "Largest holding is driving a lot of account movement." : "Exposure is reasonably spread out."}
          tone={concentrationPct > 35 ? theme.yellow : theme.green}
        />
        <PulseLine
          theme={theme}
          icon={Activity}
          title="Diversification"
          value={`${Math.round(diversificationScore)}/100`}
          text={positions.length >= 4 ? "Multiple names are balancing portfolio swings." : "Add more ideas to reduce single-stock noise."}
        />
        {biggestMover && (
          <PulseLine
            theme={theme}
            icon={biggestMover.unrealized_pl >= 0 ? ArrowUpRight : ArrowDownRight}
            title="Biggest mover"
            value={`${biggestMover.symbol} ${pct(biggestMover.unrealized_plpc)}`}
            text={`${usd(biggestMover.unrealized_pl)} unrealized P/L.`}
            tone={biggestMover.unrealized_pl >= 0 ? theme.green : theme.red}
          />
        )}
      </View>
    </Panel>
  );
}

function DiscoveryModules({ theme, ownedSymbols, openStock }: { theme: Palette; ownedSymbols: string[]; openStock: (symbol: string) => void }) {
  const watchlist = unique(["NVDA", "AAPL", "MSFT", "TSLA", "SPY", ...ownedSymbols]).slice(0, 8);
  const themes = [
    { title: "AI leaders", symbols: ["NVDA", "MSFT", "GOOGL", "META"] },
    { title: "Broad market", symbols: ["SPY", "QQQ", "VTI", "IWM"] },
    { title: "Volatile names", symbols: ["TSLA", "AMD", "PLTR", "NFLX"] },
  ];

  return (
    <Panel theme={theme} padded>
      <View style={{ gap: 15 }}>
        <SectionHeader theme={theme} title="Discovery desk" action="Quick access" />
        <View style={{ gap: 8 }}>
          <Text style={labelStyle(theme)}>Watchlist</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {watchlist.map((symbol) => (
              <TickerChip key={symbol} theme={theme} symbol={symbol} owned={ownedSymbols.includes(symbol)} selected={false} onPress={() => openStock(symbol)} />
            ))}
          </View>
        </View>
        <View style={{ gap: 10 }}>
          {themes.map((item) => (
            <View key={item.title} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 2 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontSize: 15, fontWeight: "900" }}>{item.title}</Text>
                <Text style={{ color: theme.muted, fontSize: 12 }}>{item.symbols.join(" · ")}</Text>
              </View>
              <Pressable onPress={() => openStock(item.symbols[0])} style={{ paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999, backgroundColor: theme.greenSoft }}>
                <Text style={{ color: theme.green, fontSize: 12, fontWeight: "900" }}>Open</Text>
              </Pressable>
            </View>
          ))}
        </View>
        <View style={{ borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12 }}>
          <PulseLine
            theme={theme}
            icon={Eye}
            title="Price alerts"
            value="Ready"
            text="Alert rules are staged here; push notifications can plug in next."
            tone={theme.blue}
          />
        </View>
      </View>
    </Panel>
  );
}

function PulseLine({
  theme,
  icon: Icon,
  title,
  value,
  text,
  tone,
}: {
  theme: Palette;
  icon: IconComponent;
  title: string;
  value: string;
  text: string;
  tone?: string;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 2 }}>
      <View style={{ width: 36, height: 36, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: theme.greenSoft }}>
        <Icon color={tone ?? theme.green} size={18} strokeWidth={2.5} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ color: theme.text, fontSize: 15, fontWeight: "900" }}>{title}</Text>
        <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 17 }}>{text}</Text>
      </View>
      <Text style={{ color: tone ?? theme.text, fontSize: 14, fontWeight: "900", fontVariant: ["tabular-nums"], textAlign: "right" }}>{value}</Text>
    </View>
  );
}

function CompetitionsScreen({ theme, leaders, loading }: { theme: Palette; leaders: Leader[]; loading: boolean }) {
  const top = leaders.slice(0, 3);
  const avgReturn = leaders.length ? leaders.reduce((sum, entry) => sum + Number(entry.return_pct), 0) / leaders.length : 0;

  return (
    <>
      <ScreenTitle theme={theme} label="Competitions" title="Global leaderboard" subtitle="The current competition, designed to grow into seasons and private clubs." />

      <Panel theme={theme} padded>
        <View style={{ gap: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <View style={{ gap: 4 }}>
              <Text style={{ color: theme.text, fontSize: 20, fontWeight: "900" }}>Club Sandbox</Text>
              <Text style={mutedStyle(theme)}>Always-on paper trading competition</Text>
            </View>
            <Pill theme={theme} text="Active" tone="green" />
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <MetricTile theme={theme} label="Traders" value={String(leaders.length)} icon={UserRound} />
            <MetricTile theme={theme} label="Avg return" value={pct(avgReturn)} icon={Activity} tone={avgReturn >= 0 ? theme.green : theme.red} />
          </View>
        </View>
      </Panel>

      {top.length > 0 && (
        <View style={{ gap: 10 }}>
          {top.map((entry, index) => (
            <PodiumRow key={entry.account_id} theme={theme} entry={entry} rank={index + 1} />
          ))}
        </View>
      )}

      <Panel theme={theme} padded>
        <View style={{ gap: 14 }}>
          <SectionHeader theme={theme} title="Competition hub" action="Next-ready" />
          <PulseLine theme={theme} icon={Trophy} title="Season format" value="Global" text="Current standings use live equity and can split into club seasons later." />
          <PulseLine theme={theme} icon={Eye} title="Trader detail" value="Tap rows" text="Rankings are structured for deeper trader profile and holdings views." tone={theme.blue} />
          <PulseLine theme={theme} icon={Sparkles} title="Achievements" value="Planned" text="Badges for first trade, positive return, diversification, and activity fit here." tone={theme.yellow} />
        </View>
      </Panel>

      <Panel theme={theme} padded={false}>
        <SectionHeader theme={theme} title="Rankings" padded action={loading ? "Updating" : "Live"} />
        {leaders.length ? (
          leaders.map((entry, index) => <LeaderRow key={entry.account_id} theme={theme} entry={entry} rank={index + 1} />)
        ) : (
          <EmptyState theme={theme} title="No rankings yet" text="Once traders have accounts, standings will appear here." compact />
        )}
      </Panel>
    </>
  );
}

function SettingsScreen(props: {
  theme: Palette;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  me: Me | null;
  keys: ApiKey[];
  apiKeyLabel: string;
  setApiKeyLabel: (value: string) => void;
  newSecret: string | null;
  setNewSecret: (value: string | null) => void;
  createKey: () => void;
  revokeKey: (id: string) => void;
  adminData: AdminData | null;
  adminChecked: boolean;
  adminLoading: boolean;
  loadAdmin: () => void;
  adminExpanded: Record<string, boolean>;
  setAdminExpanded: (value: Record<string, boolean>) => void;
  signOut: () => void;
}) {
  const { theme } = props;
  const dark = props.themeMode === "dark";

  return (
    <>
      <ScreenTitle theme={theme} label="Settings" title="Account settings" subtitle={props.me?.user?.email ?? "Signed in"} />

      <Panel theme={theme} padded>
        <View style={{ gap: 16 }}>
          <SettingsRow
            theme={theme}
            icon={dark ? Moon : Sun}
            title="Appearance"
            subtitle={dark ? "Dark mode" : "Light mode"}
            right={
              <Switch
                value={dark}
                onValueChange={(value) => props.setThemeMode(value ? "dark" : "light")}
                trackColor={{ false: theme.soft, true: theme.greenSoft }}
                thumbColor={dark ? theme.green : theme.faint}
              />
            }
          />
          <Divider theme={theme} />
          <SettingsRow theme={theme} icon={UserRound} title="Trader" subtitle={props.me?.account?.display_name ?? "No account"} />
          <SettingsRow theme={theme} icon={Activity} title="Backend" subtitle={API_URL} mono />
        </View>
      </Panel>

      <Panel theme={theme} padded>
        <View style={{ gap: 14 }}>
          <SectionHeader theme={theme} title="API keys" action={`${props.keys.length} total`} />
          {props.newSecret && (
            <View style={{ backgroundColor: theme.greenSoft, borderRadius: 12, padding: 14, gap: 10 }}>
              <Text style={{ color: theme.green, fontSize: 13, fontWeight: "900" }}>Save this secret now</Text>
              <Text style={{ color: theme.text, fontSize: 12, fontFamily: "Courier", lineHeight: 18 }} selectable>{props.newSecret}</Text>
              <Pressable onPress={() => props.setNewSecret(null)}>
                <Text style={{ color: theme.green, fontSize: 13, fontWeight: "900" }}>I saved it</Text>
              </Pressable>
            </View>
          )}
          <Input theme={theme} placeholder="Key label, e.g. RSI bot" value={props.apiKeyLabel} onChangeText={props.setApiKeyLabel} />
          <Button theme={theme} label="Generate API key" icon={Plus} onPress={props.createKey} />
          <View style={{ gap: 8 }}>
            {props.keys.length ? (
              props.keys.map((key) => <ApiKeyRow key={key.id} theme={theme} item={key} revokeKey={props.revokeKey} />)
            ) : (
              <Text style={mutedStyle(theme)}>No API keys yet.</Text>
            )}
          </View>
        </View>
      </Panel>

      <Panel theme={theme} padded>
        <View style={{ gap: 14 }}>
          <SectionHeader theme={theme} title="Admin access" action={props.adminData ? "Enabled" : "Restricted"} />
          {!props.adminData ? (
            <View style={{ gap: 12 }}>
              <SettingsRow
                theme={theme}
                icon={ShieldCheck}
                title={props.adminChecked ? "No admin access" : "Check admin access"}
                subtitle="Admins can inspect user portfolios and holdings."
              />
              <Button
                theme={theme}
                label={props.adminLoading ? "Checking..." : "Open admin tools"}
                onPress={props.loadAdmin}
                disabled={props.adminLoading}
                tone="secondary"
              />
            </View>
          ) : (
            <AdminPanelMobile
              theme={theme}
              data={props.adminData}
              expanded={props.adminExpanded}
              setExpanded={props.setAdminExpanded}
              loading={props.adminLoading}
              refresh={props.loadAdmin}
            />
          )}
        </View>
      </Panel>

      <Button theme={theme} label="Sign out" icon={LogOut} onPress={props.signOut} tone="secondary" />
    </>
  );
}

function AdminPanelMobile({
  theme,
  data,
  expanded,
  setExpanded,
  refresh,
  loading,
}: {
  theme: Palette;
  data: AdminData;
  expanded: Record<string, boolean>;
  setExpanded: (value: Record<string, boolean>) => void;
  refresh: () => void;
  loading: boolean;
}) {
  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <MetricTile theme={theme} label="Users" value={String(data.stats.total_users)} icon={UserRound} />
        <MetricTile theme={theme} label="AUM" value={compactUsd(data.stats.total_equity)} icon={Wallet} />
      </View>
      <Button theme={theme} label={loading ? "Refreshing..." : "Refresh admin data"} icon={RefreshCw} onPress={refresh} disabled={loading} tone="secondary" />
      <View style={{ gap: 10 }}>
        {data.accounts.map((account) => {
          const open = !!expanded[account.id];
          return (
            <View key={account.id} style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 14, backgroundColor: theme.elevated, overflow: "hidden" }}>
              <Pressable
                onPress={() => setExpanded({ ...expanded, [account.id]: !open })}
                style={{ padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ color: theme.text, fontWeight: "900", fontSize: 16 }}>{account.display_name}</Text>
                  <Text style={{ color: theme.muted, fontSize: 12 }} numberOfLines={1}>{account.email}</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Text style={{ color: theme.text, fontWeight: "900" }} selectable>{usd(account.equity)}</Text>
                  <Text style={{ color: account.return_pct >= 0 ? theme.green : theme.red, fontWeight: "800", fontSize: 12 }}>{pct(account.return_pct)}</Text>
                </View>
                {open ? <ChevronDown color={theme.muted} size={18} /> : <ChevronRight color={theme.muted} size={18} />}
              </Pressable>
              {open && (
                <View style={{ borderTopWidth: 1, borderTopColor: theme.border, padding: 12, gap: 10 }}>
                  <SummaryLine theme={theme} label="Cash" value={usd(account.cash)} />
                  <SummaryLine theme={theme} label="Orders" value={String(account.order_count)} />
                  <SummaryLine theme={theme} label="Holdings" value={String(account.position_count)} />
                  {account.positions.length ? (
                    account.positions.map((position) => (
                      <View key={position.symbol} style={{ backgroundColor: theme.card, borderRadius: 12, padding: 12, gap: 8 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                          <Text style={{ color: theme.text, fontWeight: "900", fontSize: 15 }}>{position.symbol}</Text>
                          <Text style={{ color: theme.text, fontWeight: "900" }} selectable>{usd(position.market_value)}</Text>
                        </View>
                        <SummaryLine theme={theme} label="Shares" value={shares(position.qty)} />
                        <SummaryLine theme={theme} label="Avg cost" value={usd(position.avg_entry_price)} />
                        <SummaryLine theme={theme} label="Last price" value={usd(position.current_price)} />
                      </View>
                    ))
                  ) : (
                    <Text style={mutedStyle(theme)}>No open holdings.</Text>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function BottomNav({
  theme,
  active,
  setActive,
  collapsed,
  animation,
  expand,
}: {
  theme: Palette;
  active: Tab;
  setActive: (tab: Tab) => void;
  collapsed: boolean;
  animation: Animated.Value;
  expand: () => void;
}) {
  const items: Array<{ tab: Tab; label: string; icon: IconComponent }> = [
    { tab: "portfolio", label: "Portfolio", icon: BriefcaseBusiness },
    { tab: "search", label: "Search", icon: Search },
    { tab: "competitions", label: "Compete", icon: Trophy },
    { tab: "settings", label: "Settings", icon: Settings },
  ];
  const activeItem = items.find((item) => item.tab === active) ?? items[0];
  const ActiveIcon = activeItem.icon;
  const expandedOpacity = animation;
  const collapsedOpacity = animation.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const expandedScale = animation.interpolate({ inputRange: [0, 1], outputRange: [0.84, 1] });
  const collapsedScale = animation.interpolate({ inputRange: [0, 1], outputRange: [1, 0.7] });

  return (
    <>
    <Animated.View
      style={{
        position: "absolute",
        left: 14,
        right: 14,
        bottom: 22,
        flexDirection: "row",
        gap: 4,
        backgroundColor: theme.scheme === "dark" ? "rgba(8,11,13,0.94)" : "rgba(255,255,255,0.95)",
        borderRadius: 22,
        padding: 8,
        borderWidth: 1,
        borderColor: theme.border,
        boxShadow: `0 16px 42px ${theme.shadow}`,
        opacity: expandedOpacity,
        transform: [{ scale: expandedScale }],
      }}
      pointerEvents={collapsed ? "none" : "auto"}
    >
      {items.map((item) => {
        const selected = item.tab === active;
        const Icon = item.icon;
        return (
          <Pressable
            key={item.tab}
            onPress={() => {
              expand();
              setActive(item.tab);
            }}
            style={{
              flex: 1,
              minHeight: 54,
              borderRadius: 16,
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              backgroundColor: selected ? theme.greenSoft : "transparent",
            }}
          >
            <Icon color={selected ? theme.green : theme.muted} size={21} strokeWidth={selected ? 2.8 : 2.2} />
            <Text style={{ color: selected ? theme.green : theme.muted, fontSize: 11, fontWeight: "900" }}>{item.label}</Text>
          </Pressable>
        );
      })}
    </Animated.View>

    <Animated.View
      style={{
        position: "absolute",
        right: 18,
        bottom: 24,
        width: 58,
        height: 58,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.scheme === "dark" ? "rgba(7,9,11,0.92)" : "rgba(255,255,255,0.95)",
        borderWidth: 1,
        borderColor: theme.scheme === "dark" ? "rgba(255,255,255,0.08)" : theme.border,
        boxShadow: `0 14px 36px ${theme.shadow}`,
        opacity: collapsedOpacity,
        transform: [{ scale: collapsedScale }],
      }}
      pointerEvents={collapsed ? "auto" : "none"}
    >
      <Pressable onPress={expand} style={{ width: "100%", height: "100%", alignItems: "center", justifyContent: "center" }}>
        <View style={{ position: "absolute", left: 7, right: 7, top: 7, bottom: 7, borderRadius: 18, backgroundColor: theme.greenSoft }} />
        <ActiveIcon color={theme.green} size={24} strokeWidth={2.8} />
      </Pressable>
    </Animated.View>
    </>
  );
}

type IconComponent = React.ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;

function ScreenTitle({ theme, label, title, subtitle, right }: { theme: Palette; label: string; title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={labelStyle(theme)}>{label}</Text>
        <Text style={{ color: theme.text, fontSize: 31, fontWeight: "900", letterSpacing: 0 }}>{title}</Text>
        {subtitle && <Text style={mutedStyle(theme)} numberOfLines={2}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

function SectionHeader({ theme, title, action, padded }: { theme: Palette; title: string; action?: string; padded?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, paddingHorizontal: padded ? 14 : 0, paddingTop: padded ? 14 : 0 }}>
      <Text style={{ color: theme.text, fontSize: 19, fontWeight: "900" }}>{title}</Text>
      {action && <Text style={{ color: theme.muted, fontSize: 12, fontWeight: "800" }}>{action}</Text>}
    </View>
  );
}

function Panel({ theme, children, padded }: { theme: Palette; children: React.ReactNode; padded?: boolean }) {
  const dark = theme.scheme === "dark";
  return (
    <View
      style={{
        backgroundColor: dark ? "transparent" : theme.card,
        borderColor: theme.border,
        borderWidth: dark ? 0 : 1,
        borderRadius: dark ? 0 : 18,
        padding: padded ? 16 : 0,
        overflow: "hidden",
        boxShadow: dark ? "none" : `0 8px 28px ${theme.shadow}`,
      }}
    >
      {children}
    </View>
  );
}

function MetricTile({ theme, label, value, icon: Icon, tone }: { theme: Palette; label: string; value: string; icon: IconComponent; tone?: string }) {
  const dark = theme.scheme === "dark";
  return (
    <View style={{ flex: 1, minHeight: 82, borderRadius: dark ? 0 : 15, backgroundColor: dark ? "transparent" : theme.elevated, borderWidth: dark ? 0 : 1, borderColor: theme.border, padding: 13, gap: 9 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={labelStyle(theme)}>{label}</Text>
        <Icon color={theme.faint} size={16} strokeWidth={2.4} />
      </View>
      <Text style={{ color: tone ?? theme.text, fontSize: 18, fontWeight: "900", fontVariant: ["tabular-nums"] }} selectable numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function MiniStat({ theme, label, value, tone }: { theme: Palette; label: string; value: string; tone?: string }) {
  return (
    <View style={{ flex: 1, gap: 5 }}>
      <Text style={labelStyle(theme)}>{label}</Text>
      <Text style={{ color: tone ?? theme.text, fontSize: 15, fontWeight: "900", fontVariant: ["tabular-nums"] }} selectable>{value}</Text>
    </View>
  );
}

function HoldingRow({ theme, position, onPress, featured }: { theme: Palette; position: Position; onPress: () => void; featured?: boolean }) {
  const up = Number(position.unrealized_pl) >= 0;
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: featured ? 0 : 14,
        paddingVertical: featured ? 0 : 13,
        borderTopWidth: featured ? 0 : 1,
        borderTopColor: theme.border,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      }}
    >
      <TickerMark theme={theme} symbol={position.symbol} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ color: theme.text, fontSize: 16, fontWeight: "900" }}>{position.symbol}</Text>
        <Text style={{ color: theme.muted, fontSize: 13 }} numberOfLines={1}>{companyName(position.symbol)}</Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 3 }}>
        <Text style={{ color: theme.text, fontSize: 15, fontWeight: "900", fontVariant: ["tabular-nums"] }} selectable>{usd(position.market_value)}</Text>
        <Text style={{ color: up ? theme.green : theme.red, fontSize: 12, fontWeight: "900", fontVariant: ["tabular-nums"] }}>
          {pct(position.unrealized_plpc)}
        </Text>
      </View>
      <ChevronRight color={theme.faint} size={17} />
    </Pressable>
  );
}

function OrderRow({ theme, order }: { theme: Palette; order: Order }) {
  const buy = order.side === "buy";
  return (
    <View style={{ paddingHorizontal: 14, paddingVertical: 13, borderTopWidth: 1, borderTopColor: theme.border, flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: buy ? theme.greenSoft : theme.redSoft }}>
        {buy ? <ArrowUpRight color={theme.green} size={18} /> : <ArrowDownRight color={theme.red} size={18} />}
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ color: theme.text, fontWeight: "900" }}>{order.side.toUpperCase()} {order.symbol}</Text>
        <Text style={{ color: theme.muted, fontSize: 12 }}>{shares(order.qty)} shares - {order.type}</Text>
      </View>
      <Pill theme={theme} text={order.status.replace("_", " ")} tone={order.status === "filled" ? "green" : "neutral"} />
    </View>
  );
}

function LeaderRow({ theme, entry, rank }: { theme: Palette; entry: Leader; rank: number }) {
  const pl = Number(entry.equity) - Number(entry.starting_cash);
  const up = Number(entry.return_pct) >= 0;
  return (
    <View style={{ paddingHorizontal: 14, paddingVertical: 14, borderTopWidth: 1, borderTopColor: theme.border, flexDirection: "row", alignItems: "center", gap: 12 }}>
      <RankBadge theme={theme} rank={rank} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ color: theme.text, fontSize: 15, fontWeight: "900" }} numberOfLines={1}>{entry.display_name}</Text>
        <Text style={{ color: theme.muted, fontSize: 12 }} selectable>{usd(entry.equity)}</Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 3 }}>
        <Text style={{ color: up ? theme.green : theme.red, fontSize: 18, fontWeight: "900", fontVariant: ["tabular-nums"] }}>{pct(entry.return_pct)}</Text>
        <Text style={{ color: theme.muted, fontSize: 12, fontVariant: ["tabular-nums"] }}>{usd(pl)}</Text>
      </View>
    </View>
  );
}

function PodiumRow({ theme, entry, rank }: { theme: Palette; entry: Leader; rank: number }) {
  return (
    <Panel theme={theme} padded>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 13 }}>
        <RankBadge theme={theme} rank={rank} large />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ color: theme.muted, fontSize: 12, fontWeight: "900" }}>Rank {rank}</Text>
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: "900" }}>{entry.display_name}</Text>
        </View>
        <Text style={{ color: entry.return_pct >= 0 ? theme.green : theme.red, fontSize: 22, fontWeight: "900", fontVariant: ["tabular-nums"] }}>
          {pct(entry.return_pct)}
        </Text>
      </View>
    </Panel>
  );
}

function RankBadge({ theme, rank, large }: { theme: Palette; rank: number; large?: boolean }) {
  const podium = rank <= 3;
  const color = rank === 1 ? theme.green : rank === 2 ? theme.blue : rank === 3 ? theme.yellow : theme.muted;
  return (
    <View
      style={{
        width: large ? 46 : 38,
        height: large ? 46 : 38,
        borderRadius: large ? 16 : 13,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: podium ? `${color}22` : theme.elevated,
        borderWidth: 1,
        borderColor: podium ? color : theme.border,
      }}
    >
      {rank === 1 ? (
        <Trophy color={color} size={large ? 22 : 18} />
      ) : (
        <Text style={{ color, fontSize: large ? 16 : 13, fontWeight: "900" }}>{rank}</Text>
      )}
    </View>
  );
}

function ApiKeyRow({ theme, item, revokeKey }: { theme: Palette; item: ApiKey; revokeKey: (id: string) => void }) {
  const revoked = !!item.revoked_at;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: theme.elevated, borderRadius: 13, borderWidth: 1, borderColor: theme.border, padding: 12, opacity: revoked ? 0.55 : 1 }}>
      <KeyRound color={theme.muted} size={18} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ color: theme.text, fontWeight: "900" }}>{item.label || "Trading bot"}</Text>
        <Text style={{ color: theme.muted, fontSize: 11, fontFamily: "Courier" }} selectable numberOfLines={1}>{item.key_id}</Text>
      </View>
      {revoked ? (
        <Pill theme={theme} text="Revoked" tone="neutral" />
      ) : (
        <Pressable onPress={() => revokeKey(item.id)} hitSlop={10}>
          <Text style={{ color: theme.red, fontSize: 12, fontWeight: "900" }}>Revoke</Text>
        </Pressable>
      )}
    </View>
  );
}

function SettingsRow({ theme, icon: Icon, title, subtitle, right, mono }: { theme: Palette; icon: IconComponent; title: string; subtitle: string; right?: React.ReactNode; mono?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: theme.elevated }}>
        <Icon color={theme.green} size={19} strokeWidth={2.4} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ color: theme.text, fontSize: 15, fontWeight: "900" }}>{title}</Text>
        <Text style={{ color: theme.muted, fontSize: 12, fontFamily: mono ? "Courier" : undefined }} numberOfLines={2} selectable={mono}>{subtitle}</Text>
      </View>
      {right}
    </View>
  );
}

function TrustRow({ theme, icon: Icon, title, text }: { theme: Palette; icon: IconComponent; title: string; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 8 }}>
      <Icon color={theme.green} size={17} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.text, fontSize: 13, fontWeight: "900" }}>{title}</Text>
        <Text style={{ color: theme.muted, fontSize: 12 }}>{text}</Text>
      </View>
    </View>
  );
}

function SparklineChart({ theme, values, positive, height }: { theme: Palette; values: number[]; positive: boolean; height: number }) {
  const clean = values.filter((value) => Number.isFinite(value) && value > 0);
  const data = clean.length > 1 ? clean : [1, 1];
  const width = 320;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const color = positive ? theme.green : theme.red;
  const line = data
    .map((value, index) => {
      const x = (index / Math.max(1, data.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 22) - 11;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;
  const grad = positive ? "greenGrad" : "redGrad";

  return (
    <View style={{ height, borderRadius: 16, backgroundColor: theme.scheme === "dark" ? "#07100b" : "#f1f7f3", overflow: "hidden" }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={grad} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.34" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Path d={area} fill={`url(#${grad})`} />
        <Path d={line} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

function ChangeLine({ theme, value, pct: pctValue, suffix }: { theme: Palette; value: number; pct: number; suffix: string }) {
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  const color = up ? theme.green : theme.red;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
      <Icon color={color} size={17} strokeWidth={2.8} />
      <Text style={{ color, fontSize: 15, fontWeight: "900", fontVariant: ["tabular-nums"] }}>
        {usd(Math.abs(value))} ({pct(Math.abs(pctValue))}) {suffix}
      </Text>
    </View>
  );
}

function TickerChip({ theme, symbol, selected, owned, onPress }: { theme: Palette; symbol: string; selected: boolean; owned: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: 999,
        paddingHorizontal: 13,
        paddingVertical: 9,
        backgroundColor: selected ? theme.text : theme.elevated,
        borderWidth: 1,
        borderColor: selected ? theme.text : theme.border,
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
      }}
    >
      <Text style={{ color: selected ? theme.inverse : theme.text, fontWeight: "900", fontSize: 13 }}>{symbol}</Text>
      {owned && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: selected ? theme.inverse : theme.green }} />}
    </Pressable>
  );
}

function TickerMark({ theme, symbol }: { theme: Palette; symbol: string }) {
  return (
    <View style={{ width: 42, height: 42, borderRadius: 15, backgroundColor: theme.elevated, borderWidth: 1, borderColor: theme.border, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: theme.text, fontWeight: "900", fontSize: 13 }}>{symbol.slice(0, 2)}</Text>
    </View>
  );
}

function LogoMark({ theme, size }: { theme: Palette; size: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.24, alignItems: "center", justifyContent: "center", backgroundColor: theme.green }}>
      <Text style={{ color: "#000", fontSize: size * 0.45, fontWeight: "900" }}>P</Text>
    </View>
  );
}

function CenterShell({ theme, themeMode, children }: { theme: Palette; themeMode: ThemeMode; children: React.ReactNode }) {
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: "center", justifyContent: "center", gap: 18 }}>
      <StatusBar style={themeMode === "dark" ? "light" : "dark"} />
      {children}
    </View>
  );
}

function EmptyState({ theme, title, text, compact }: { theme: Palette; title: string; text: string; compact?: boolean }) {
  return (
    <View style={{ padding: compact ? 18 : 24, alignItems: "center", gap: 8 }}>
      <Text style={{ color: theme.text, fontSize: 16, fontWeight: "900", textAlign: "center" }}>{title}</Text>
      <Text style={{ color: theme.muted, fontSize: 13, textAlign: "center", lineHeight: 19 }}>{text}</Text>
    </View>
  );
}

function Banner({ theme, text, tone, onDismiss }: { theme: Palette; text: string; tone: "danger" | "success"; onDismiss?: () => void }) {
  const danger = tone === "danger";
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: danger ? theme.redSoft : theme.greenSoft, borderRadius: 13, padding: 12 }}>
      <Text style={{ flex: 1, color: danger ? theme.red : theme.green, fontWeight: "800", fontSize: 13 }} selectable>{text}</Text>
      {onDismiss && (
        <Pressable onPress={onDismiss} hitSlop={10}>
          <X color={danger ? theme.red : theme.green} size={16} />
        </Pressable>
      )}
    </View>
  );
}

function Button({
  theme,
  label,
  onPress,
  disabled,
  tone = "primary",
  icon: Icon,
}: {
  theme: Palette;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: "primary" | "secondary" | "danger";
  icon?: IconComponent;
}) {
  const bg = tone === "secondary" ? theme.elevated : tone === "danger" ? theme.red : theme.green;
  const fg = tone === "secondary" ? theme.text : "#000";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        opacity: disabled ? 0.45 : 1,
        borderRadius: 14,
        paddingVertical: 15,
        paddingHorizontal: 16,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
        backgroundColor: bg,
        borderWidth: tone === "secondary" ? 1 : 0,
        borderColor: theme.border,
      }}
    >
      {Icon && <Icon color={fg} size={18} strokeWidth={2.8} />}
      <Text style={{ color: fg, fontSize: 15, fontWeight: "900" }}>{label}</Text>
    </Pressable>
  );
}

function IconButton({ theme, icon: Icon, onPress, disabled }: { theme: Palette; icon: IconComponent; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{ width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, opacity: disabled ? 0.45 : 1 }}
    >
      <Icon color={theme.text} size={19} />
    </Pressable>
  );
}

function Segment({
  theme,
  value,
  options,
  onChange,
  dangerOption,
}: {
  theme: Palette;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  dangerOption?: string;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 4, padding: 4, borderRadius: 14, backgroundColor: theme.elevated, borderWidth: 1, borderColor: theme.border }}>
      {options.map((option) => {
        const selected = value === option;
        const isDanger = option === dangerOption;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            style={{
              flex: 1,
              paddingVertical: 10,
              alignItems: "center",
              borderRadius: 10,
              backgroundColor: selected ? (isDanger ? theme.red : theme.text) : "transparent",
            }}
          >
            <Text style={{ color: selected ? (isDanger ? "#fff" : theme.inverse) : theme.muted, fontSize: 13, fontWeight: "900", textTransform: "capitalize" }}>{option}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Input(props: React.ComponentProps<typeof TextInput> & { theme: Palette }) {
  const { theme, style, ...rest } = props;
  return (
    <TextInput
      {...rest}
      placeholderTextColor={theme.faint}
      style={[
        {
          color: theme.text,
          backgroundColor: theme.elevated,
          borderColor: theme.border,
          borderWidth: 1,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 13,
          fontSize: 16,
          fontWeight: "700",
        },
        style,
      ]}
    />
  );
}

function Pill({ theme, text, tone }: { theme: Palette; text: string; tone: "green" | "neutral" }) {
  const green = tone === "green";
  return (
    <View style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: green ? theme.greenSoft : theme.elevated }}>
      <Text style={{ color: green ? theme.green : theme.muted, fontSize: 11, fontWeight: "900", textTransform: "capitalize" }}>{text}</Text>
    </View>
  );
}

function SummaryLine({ theme, label, value, strong }: { theme: Palette; label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
      <Text style={{ color: theme.muted, fontSize: 13, fontWeight: "700" }}>{label}</Text>
      <Text style={{ color: theme.text, fontSize: strong ? 16 : 13, fontWeight: strong ? "900" : "800", fontVariant: ["tabular-nums"] }} selectable>{value}</Text>
    </View>
  );
}

function Divider({ theme }: { theme: Palette }) {
  return <View style={{ height: 1, backgroundColor: theme.border }} />;
}

function labelStyle(theme: Palette): TextStyle {
  return { color: theme.muted, fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.7 };
}

function mutedStyle(theme: Palette): TextStyle {
  return { color: theme.muted, fontSize: 14, lineHeight: 20 };
}

function heroStyle(theme: Palette): TextStyle {
  return { color: theme.text, fontSize: 42, fontWeight: "900", letterSpacing: 0, fontVariant: ["tabular-nums"] };
}

function quoteDelta(quote?: Quote) {
  if (!quote?.prevClose) return null;
  const value = Number(quote.price) - Number(quote.prevClose);
  return { value, pct: (value / Number(quote.prevClose)) * 100 };
}

function companyName(symbol: string) {
  return COMPANY_NAMES[symbol] ?? symbol;
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function usd(n: number | string | undefined | null) {
  return `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function compactUsd(n: number | string | undefined | null) {
  const value = Number(n || 0);
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return usd(value);
}

function pct(n: number | string | undefined | null) {
  return `${Number(n || 0).toFixed(2)}%`;
}

function shares(n: number | string | undefined | null) {
  return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function timeGreeting(name?: string | null) {
  const hour = new Date().getHours();
  const period = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  const trimmed = typeof name === "string" ? name.trim() : "";
  const firstSpace = trimmed.indexOf(" ");
  const cleanName = firstSpace === -1 ? trimmed : trimmed.slice(0, firstSpace);
  if (!cleanName) return `Good ${period}`;
  return `Good ${period}, ${cleanName}`;
}
