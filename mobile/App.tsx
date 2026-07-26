import Constants from "expo-constants";
import { fetch } from "expo/fetch";
import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, AppState, NativeScrollEvent, NativeSyntheticEvent, RefreshControl, ScrollView, Text, useColorScheme, View } from "react-native";
import { BottomNav } from "./src/bottom-nav";
import {
  AdminScreen,
  AuthScreen,
  CompeteScreen,
  DiscoverScreen,
  PortfolioScreen,
  ProfileScreen,
  screenBottomPadding,
} from "./src/screens";
import { applyTheme, colors, resolveTheme, type ThemePreference } from "./src/theme";
import type { AdminData, AmountMode, ApiKey, Bar, DiscoverView, LeaderboardEntry, Me, Order, OrderType, Quote, Session, Side, Tab } from "./src/types";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ||
  "http://127.0.0.1:3000";

const starterSymbols = ["AAPL", "NVDA", "TSLA", "MSFT", "SPY", "QQQ", "AMD", "META", "AMZN", "GOOGL", "NFLX"];

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
  const systemScheme = useColorScheme();
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [tab, setTabState] = useState<Tab>("portfolio");
  const [discoverView, setDiscoverView] = useState<DiscoverView>("list");
  const [profileView, setProfileView] = useState<"settings" | "admin">("settings");
  const [me, setMe] = useState<Me | null>(null);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [bars, setBars] = useState<Bar[]>([]);
  const [chartRange, setChartRange] = useState("1h");
  const [selectedSymbol, setSelectedSymbol] = useState("NVDA");
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState<{ symbol: string; quote: Quote } | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [side, setSide] = useState<Side>("buy");
  const [orderType, setOrderType] = useState<OrderType>("market");
  const [amountMode, setAmountMode] = useState<AmountMode>("shares");
  const [amount, setAmount] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [orderBusy, setOrderBusy] = useState(false);
  const [orderMessage, setOrderMessage] = useState("");
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>("system");
  const [newSecret, setNewSecret] = useState("");
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [navTucked, setNavTucked] = useState(false);
  const navX = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const inFlight = useRef(false);
  const resolvedTheme = resolveTheme(themePreference, systemScheme);
  applyTheme(resolvedTheme);

  const selectedQuote = quotes[selectedSymbol] ?? null;
  const selectedPosition = useMemo(() => me?.positions.find((p) => p.symbol === selectedSymbol) ?? null, [me?.positions, selectedSymbol]);

  useEffect(() => {
    restoreSession();
  }, []);

  useEffect(() => {
    Animated.timing(navX, {
      toValue: navTucked ? 126 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [navTucked, navX]);

  useEffect(() => {
    if (!session) return;
    refreshAll(true);
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshAll(false);
    });
    const id = setInterval(() => refreshAll(false), 20000);
    return () => {
      sub.remove();
      clearInterval(id);
    };
  }, [session, selectedSymbol]);

  useEffect(() => {
    if (!session || tab !== "discover") return;
    const symbol = search.trim().toUpperCase();
    if (!symbol) {
      setSearchResult(null);
      setSearchLoading(false);
      return;
    }
    const id = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const quote = await api<Quote>(`/api/quote?symbol=${encodeURIComponent(symbol)}`);
        const parsed = normalizeQuote(quote, symbol);
        setQuotes((prev) => ({ ...prev, [symbol]: parsed }));
        setSearchResult({ symbol, quote: parsed });
      } catch {
        setSearchResult(null);
      } finally {
        setSearchLoading(false);
      }
    }, 320);
    return () => clearTimeout(id);
  }, [search, session, tab]);

  useEffect(() => {
    if (!session || tab !== "discover" || discoverView === "list") return;
    refreshSelectedMarketData();
  }, [session, selectedSymbol, chartRange, tab, discoverView]);

  useEffect(() => {
    if (!selectedQuote?.price) return;
    setLimitPrice((current) => current || selectedQuote.price.toFixed(2));
  }, [selectedQuote?.price, selectedSymbol]);

  async function restoreSession() {
    const [stored, storedTheme] = await Promise.all([
      SecureStore.getItemAsync("paper-trader-session").catch(() => null),
      SecureStore.getItemAsync("paper-trader-theme").catch(() => null),
    ]);
    if (stored) setSession(JSON.parse(stored));
    if (storedTheme && ["system", "light", "dark", "midnight"].includes(storedTheme)) {
      setThemePreferenceState(storedTheme as ThemePreference);
    }
    setChecking(false);
  }

  function setThemePreference(next: ThemePreference) {
    setThemePreferenceState(next);
    SecureStore.setItemAsync("paper-trader-theme", next).catch(() => {});
  }

  async function saveSession(next: Session | null) {
    setSession(next);
    if (next) await SecureStore.setItemAsync("paper-trader-session", JSON.stringify(next));
    else await SecureStore.deleteItemAsync("paper-trader-session").catch(() => {});
  }

  async function refreshSession() {
    if (!session?.refresh_token) throw new Error("No refresh token");
    const res = await fetchWithTimeout(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "refresh failed");
    await saveSession(body);
    return body as Session;
  }

  async function api<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
    const token = session?.access_token;
    const res = await fetchWithTimeout(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
    if (res.status === 401 && retry && session?.refresh_token) {
      const next = await refreshSession();
      const retryRes = await fetchWithTimeout(`${API_URL}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${next.access_token}`,
          ...(options.headers || {}),
        },
      });
      if (!retryRes.ok) {
        const body = await retryRes.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${retryRes.status}`);
      }
      return retryRes.json() as Promise<T>;
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  async function apiForm<T>(path: string, form: FormData): Promise<T> {
    const res = await fetchWithTimeout(`${API_URL}${path}`, {
      method: "POST",
      headers: {
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: form as unknown as BodyInit,
    });
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
    if (!session || inFlight.current) return;
    inFlight.current = true;
    if (showSpinner) setRefreshing(true);
    try {
      const nextMe = await api<Me>("/api/me");
      const symbols = symbolsFor(nextMe, selectedSymbol);
      const [nextQuotes, nextKeys, nextLeaderboard] = await Promise.all([
        api<{ quotes: Quote[] }>(`/api/quotes?symbols=${encodeURIComponent(symbols.join(","))}`),
        api<{ keys: ApiKey[] }>("/api/keys").catch(() => ({ keys: [] })),
        api<{ entries: LeaderboardEntry[] }>("/api/leaderboard").catch(() => ({ entries: [] })),
      ]);
      setMe(nextMe);
      setKeys(nextKeys.keys ?? []);
      setLeaderboard(nextLeaderboard.entries ?? []);
      setQuotes((prev) => ({
        ...prev,
        ...Object.fromEntries((nextQuotes.quotes ?? []).map((q) => [String(q.symbol).toUpperCase(), normalizeQuote(q, String(q.symbol))])),
      }));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not refresh");
    } finally {
      setRefreshing(false);
      inFlight.current = false;
    }
  }

  async function refreshSelectedMarketData() {
    try {
      const [quote, chart] = await Promise.all([
        api<Quote>(`/api/quote?symbol=${encodeURIComponent(selectedSymbol)}`),
        api<{ bars: Bar[] }>(`/api/chart?symbol=${encodeURIComponent(selectedSymbol)}&range=${encodeURIComponent(chartRange)}`),
      ]);
      setQuotes((prev) => ({ ...prev, [selectedSymbol]: normalizeQuote(quote, selectedSymbol) }));
      setBars(chart.bars ?? []);
      setError("");
    } catch (e) {
      setBars([]);
      setError(e instanceof Error ? e.message : "Market data unavailable");
    }
  }

  async function submitOrder() {
    const quotePrice = selectedQuote?.price ?? 0;
    const price = orderType === "limit" && Number(limitPrice) > 0 ? Number(limitPrice) : quotePrice;
    const input = Number(amount) || 0;
    const qty = amountMode === "dollars" ? (price > 0 ? input / price : 0) : input;
    if (!qty || qty <= 0) {
      setOrderMessage("Enter an order amount first.");
      return;
    }
    setOrderBusy(true);
    setOrderMessage("");
    try {
      const order = await api<Order>("/api/trade", {
        method: "POST",
        body: JSON.stringify({
          symbol: selectedSymbol,
          qty: Math.floor(qty * 10000) / 10000,
          side,
          type: orderType,
          limit_price: orderType === "limit" ? Number(limitPrice) : undefined,
        }),
      });
      setOrderMessage(`${side === "buy" ? "Buy" : "Sell"} order ${order.status.replace(/_/g, " ")}.`);
      setAmount("");
      await refreshAll(false);
      setDiscoverView("detail");
    } catch (e) {
      setOrderMessage(e instanceof Error ? e.message : "Order failed");
    } finally {
      setOrderBusy(false);
    }
  }

  async function addWatch() {
    try {
      await api("/api/watchlists", { method: "POST", body: JSON.stringify({ symbol: selectedSymbol }) });
      await refreshAll(false);
      Alert.alert("Watchlist updated", `${selectedSymbol} is now in your watchlist.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Watchlist unavailable");
    }
  }

  async function createAlert(direction: "above" | "below") {
    if (!selectedQuote?.price) return;
    const target = direction === "above" ? selectedQuote.price * 1.03 : selectedQuote.price * 0.97;
    try {
      await api("/api/alerts", { method: "POST", body: JSON.stringify({ symbol: selectedSymbol, direction, target_price: target.toFixed(2) }) });
      await refreshAll(false);
      Alert.alert("Alert created", `${selectedSymbol} ${direction} ${target.toFixed(2)}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Alerts unavailable");
    }
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

  async function pickAvatar() {
    setError("");
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Photo library permission is required to add a profile picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.82,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const form = new FormData();
    form.append("avatar", {
      uri: asset.uri,
      name: asset.fileName || "avatar.jpg",
      type: asset.mimeType || "image/jpeg",
    } as unknown as Blob);
    try {
      await apiForm<{ avatar_url: string }>("/api/profile/avatar", form);
      await refreshAll(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not upload profile picture");
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
              await signOut();
              Alert.alert("Account deleted", "Your Paper Trader account has been deleted.");
            } catch (e) {
              setError(e instanceof Error ? e.message : "Could not delete account");
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  }

  async function signOut() {
    await saveSession(null);
    setMe(null);
    setKeys([]);
    setLeaderboard([]);
    setAdminData(null);
    setNewSecret("");
  }

  async function openAdmin() {
    setProfileView("admin");
    await loadAdmin();
  }

  async function loadAdmin() {
    setAdminLoading(true);
    setAdminError("");
    try {
      const next = await api<AdminData>("/api/admin");
      setAdminData(next);
    } catch (e) {
      setAdminError(e instanceof Error ? e.message : "Admin unavailable");
    } finally {
      setAdminLoading(false);
    }
  }

  async function runAdminAction(action: string, payload: Record<string, unknown>) {
    setAdminError("");
    try {
      await api("/api/admin", { method: "POST", body: JSON.stringify({ action, ...payload }) });
      await Promise.all([loadAdmin(), refreshAll(false)]);
    } catch (e) {
      setAdminError(e instanceof Error ? e.message : "Admin action failed");
    }
  }

  function setTab(next: Tab) {
    setTabState(next);
    setNavTucked(false);
    if (next !== "discover") setDiscoverView("list");
    if (next !== "profile") setProfileView("settings");
  }

  function openSymbol(symbol: string) {
    setSelectedSymbol(symbol.toUpperCase());
    setTabState("discover");
    setDiscoverView("detail");
    setNavTucked(false);
  }

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const y = event.nativeEvent.contentOffset.y;
    if (y > lastScrollY.current + 14 && y > 100) setNavTucked(true);
    if (y < lastScrollY.current - 28 || y < 20) setNavTucked(false);
    lastScrollY.current = y;
  }

  if (checking) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <StatusBar style={resolvedTheme === "light" ? "dark" : "light"} />
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!session) {
    return (
      <>
        <StatusBar style={resolvedTheme === "light" ? "dark" : "light"} />
        <AuthScreen
          mode={authMode}
          setMode={setAuthMode}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          displayName={displayName}
          setDisplayName={setDisplayName}
          submit={authenticate}
          busy={busy}
          error={error}
        />
      </>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={resolvedTheme === "light" ? "dark" : "light"} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onScroll={handleScroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => refreshAll(true)} tintColor={colors.accent} />}
        contentContainerStyle={{ padding: 24, paddingTop: 52, paddingBottom: screenBottomPadding, gap: 20, backgroundColor: colors.bg }}
      >
        {error ? <Text selectable style={{ color: colors.red, fontSize: 13, lineHeight: 19 }}>{error}</Text> : null}
        {tab === "portfolio" ? (
          <PortfolioScreen me={me} quotes={quotes} openSymbol={openSymbol} refreshing={refreshing} />
        ) : tab === "discover" ? (
          <DiscoverScreen
            view={discoverView}
            setView={setDiscoverView}
            me={me}
            quotes={quotes}
            selectedSymbol={selectedSymbol}
            setSelectedSymbol={(symbol) => {
              setSelectedSymbol(symbol.toUpperCase());
              setLimitPrice("");
            }}
            bars={bars}
            chartRange={chartRange}
            setChartRange={setChartRange}
            quote={selectedQuote}
            position={selectedPosition}
            search={search}
            setSearch={setSearch}
            searchResult={searchResult}
            searchLoading={searchLoading}
            side={side}
            setSide={setSide}
            orderType={orderType}
            setOrderType={setOrderType}
            amountMode={amountMode}
            setAmountMode={setAmountMode}
            amount={amount}
            setAmount={setAmount}
            limitPrice={limitPrice}
            setLimitPrice={setLimitPrice}
            submitOrder={submitOrder}
            orderBusy={orderBusy}
            orderMessage={orderMessage}
            addWatch={addWatch}
            createAlert={createAlert}
          />
        ) : tab === "compete" ? (
          <CompeteScreen entries={leaderboard} currentAccountId={me?.account?.id} />
        ) : profileView === "admin" ? (
          <AdminScreen data={adminData} loading={adminLoading} error={adminError} back={() => setProfileView("settings")} runAction={runAdminAction} />
        ) : (
          <ProfileScreen
            me={me}
            keys={keys}
            newSecret={newSecret}
            createKey={createKey}
            deleteAccount={deleteAccount}
            pickAvatar={pickAvatar}
            signOut={signOut}
            openAdmin={openAdmin}
            themePreference={themePreference}
            setThemePreference={setThemePreference}
            busy={busy}
          />
        )}
      </ScrollView>
      <BottomNav tab={tab} setTab={setTab} tucked={navTucked} animatedX={navX} />
    </View>
  );
}

function symbolsFor(me: Me, selectedSymbol: string) {
  return Array.from(new Set([
    selectedSymbol,
    ...starterSymbols,
    ...(me.positions ?? []).map((p) => p.symbol),
    ...(me.watchlist ?? []).map((w) => w.symbol),
  ].filter(Boolean).map((symbol) => symbol.toUpperCase()))).slice(0, 25);
}

function normalizeQuote(raw: Quote, fallbackSymbol: string): Quote {
  return {
    ...raw,
    symbol: (raw.symbol ?? fallbackSymbol).toUpperCase(),
    price: Number(raw.price),
    prevClose: raw.prevClose == null ? null : Number(raw.prevClose),
    change: raw.change == null ? null : Number(raw.change),
    changePercent: raw.changePercent == null ? null : Number(raw.changePercent),
    marketCap: raw.marketCap == null ? null : Number(raw.marketCap),
    trailingPE: raw.trailingPE == null ? null : Number(raw.trailingPE),
    forwardPE: raw.forwardPE == null ? null : Number(raw.forwardPE),
    volume: raw.volume == null ? null : Number(raw.volume),
    averageVolume: raw.averageVolume == null ? null : Number(raw.averageVolume),
    open: raw.open == null ? null : Number(raw.open),
    dayHigh: raw.dayHigh == null ? null : Number(raw.dayHigh),
    dayLow: raw.dayLow == null ? null : Number(raw.dayLow),
    yearHigh: raw.yearHigh == null ? null : Number(raw.yearHigh),
    yearLow: raw.yearLow == null ? null : Number(raw.yearLow),
  };
}
