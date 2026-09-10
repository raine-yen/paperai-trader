import Constants from "expo-constants";
import { fetch } from "expo/fetch";
import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, AppState, RefreshControl, ScrollView, Text, useColorScheme, useWindowDimensions, View } from "react-native";
import { BottomNav } from "./src/bottom-nav";
import { PREVIEW_BARS, PREVIEW_LEADERBOARD, PREVIEW_ME, PREVIEW_PREDICTION_HISTORY, PREVIEW_PREDICTION_MARKETS, PREVIEW_QUOTES, PREVIEW_SESSION } from "./src/preview-data";
import {
  AdminScreen,
  AuthScreen,
  CompeteScreen,
  DiscoverScreen,
  PortfolioScreen,
  PredictionsScreen,
  ProfileScreen,
  screenBottomPadding,
} from "./src/screens";
import { applyTheme, colors, contentMaxWidth, layoutBreakpoints, resolveTheme, space, tabletNavWidth, type ThemePreference } from "./src/theme";
import type { AdminData, AmountMode, ApiKey, Bar, DiscoverView, LeaderboardEntry, Me, Order, OrderStage, OrderType, PredictionHistoryPoint, PredictionMarket, PredictionOutcome, PredictionTradeResult, PredictionView, Quote, Session, Side, Tab } from "./src/types";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ||
  "http://127.0.0.1:3000";

const starterSymbols = ["AAPL", "NVDA", "TSLA", "MSFT", "SPY", "QQQ", "AMD", "META", "AMZN", "GOOGL", "GME", "RKLB", "BTC-USD", "ETH-USD", "DOGE-USD", "PEPE-USD"];
const APP_STORE_PREVIEW = process.env.EXPO_PUBLIC_APP_STORE_PREVIEW === "1";

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
  const { width } = useWindowDimensions();
  const isTablet = width >= layoutBreakpoints.regular;
  const [session, setSession] = useState<Session | null>(APP_STORE_PREVIEW ? PREVIEW_SESSION : null);
  const [checking, setChecking] = useState(!APP_STORE_PREVIEW);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [tab, setTabState] = useState<Tab>("portfolio");
  const [discoverView, setDiscoverView] = useState<DiscoverView>("list");
  const [profileView, setProfileView] = useState<"settings" | "admin">("settings");
  const [me, setMe] = useState<Me | null>(APP_STORE_PREVIEW ? PREVIEW_ME : null);
  const [quotes, setQuotes] = useState<Record<string, Quote>>(APP_STORE_PREVIEW ? PREVIEW_QUOTES : {});
  const [bars, setBars] = useState<Bar[]>(APP_STORE_PREVIEW ? PREVIEW_BARS : []);
  const [chartRange, setChartRange] = useState("1h");
  const [selectedSymbol, setSelectedSymbol] = useState(APP_STORE_PREVIEW ? "AAPL" : "NVDA");
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState<{ symbol: string; quote: Quote } | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [side, setSide] = useState<Side>("buy");
  const [orderType, setOrderType] = useState<OrderType>("market");
  const [amountMode, setAmountMode] = useState<AmountMode>("shares");
  const [amount, setAmount] = useState(APP_STORE_PREVIEW ? "10" : "");
  const [limitPrice, setLimitPrice] = useState("");
  const [orderStage, setOrderStageState] = useState<OrderStage>("configure");
  const [reviewQuotePrice, setReviewQuotePrice] = useState<number | null>(null);
  const [reviewClientOrderId, setReviewClientOrderId] = useState<string | null>(null);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [orderBusy, setOrderBusy] = useState(false);
  const [orderMessage, setOrderMessage] = useState("");
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(APP_STORE_PREVIEW ? PREVIEW_LEADERBOARD : []);
  const [predictionMarkets, setPredictionMarkets] = useState<PredictionMarket[]>(APP_STORE_PREVIEW ? PREVIEW_PREDICTION_MARKETS : []);
  const [predictionsLoading, setPredictionsLoading] = useState(false);
  const [predictionView, setPredictionView] = useState<PredictionView>("list");
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [predictionHistory, setPredictionHistory] = useState<PredictionHistoryPoint[]>([]);
  const [predictionHistoryLoading, setPredictionHistoryLoading] = useState(false);
  const [predictionOutcome, setPredictionOutcome] = useState<PredictionOutcome>("yes");
  const [predictionMode, setPredictionMode] = useState<Side>("buy");
  const [predictionAmount, setPredictionAmount] = useState(APP_STORE_PREVIEW ? "25" : "25");
  const [predictionStage, setPredictionStage] = useState<OrderStage>("configure");
  const [predictionBusy, setPredictionBusy] = useState(false);
  const [predictionMessage, setPredictionMessage] = useState("");
  const [predictionResult, setPredictionResult] = useState<PredictionTradeResult | null>(null);
  const predictionSubmitInFlight = useRef(false);
  const predictionHistoryGeneration = useRef(0);
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(APP_STORE_PREVIEW ? "light" : "system");
  const [newSecret, setNewSecret] = useState("");
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const inFlight = useRef(false);
  const searchGeneration = useRef(0);
  const marketDataGeneration = useRef(0);
  const orderSubmitInFlight = useRef(false);
  const resolvedTheme = resolveTheme(themePreference, systemScheme);
  applyTheme(resolvedTheme);

  const selectedQuote = quotes[selectedSymbol] ?? null;
  const selectedPosition = useMemo(() => me?.positions.find((p) => p.symbol === selectedSymbol) ?? null, [me?.positions, selectedSymbol]);

  useEffect(() => {
    if (!APP_STORE_PREVIEW) restoreSession();
  }, []);

  useEffect(() => {
    if (!session || APP_STORE_PREVIEW) return;
    refreshAll(true);
  }, [session]);

  useEffect(() => {
    if (!session || APP_STORE_PREVIEW) return;
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
      searchGeneration.current += 1;
      setSearchResult(null);
      setSearchLoading(false);
      setSearchError("");
      return;
    }
    if (APP_STORE_PREVIEW) {
      const previewQuote = PREVIEW_QUOTES[symbol];
      setSearchResult(previewQuote ? { symbol, quote: previewQuote } : null);
      setSearchLoading(false);
      setSearchError(previewQuote ? "" : "No preview symbol matches that search.");
      return;
    }
    const generation = ++searchGeneration.current;
    const id = setTimeout(async () => {
      setSearchLoading(true);
      setSearchError("");
      try {
        const quote = await api<Quote>(`/api/quote?symbol=${encodeURIComponent(symbol)}`);
        if (generation !== searchGeneration.current) return;
        const parsed = normalizeQuote(quote, symbol);
        setQuotes((prev) => ({ ...prev, [symbol]: parsed }));
        setSearchResult({ symbol, quote: parsed });
      } catch (searchFailure) {
        if (generation !== searchGeneration.current) return;
        setSearchResult(null);
        setSearchError(searchFailure instanceof Error ? searchFailure.message : "Market search is unavailable. Try again.");
      } finally {
        if (generation === searchGeneration.current) setSearchLoading(false);
      }
    }, 320);
    return () => {
      clearTimeout(id);
      if (generation === searchGeneration.current) setSearchLoading(false);
    };
  }, [search, session, tab]);

  useEffect(() => {
    if (!session || APP_STORE_PREVIEW || tab !== "discover" || discoverView === "list") return;
    refreshSelectedMarketData();
  }, [session, selectedSymbol, chartRange, tab, discoverView]);

  useEffect(() => {
    if (!selectedQuote?.price) return;
    setLimitPrice((current) => current || selectedQuote.price.toFixed(2));
  }, [selectedQuote?.price, selectedSymbol]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [tab, discoverView, orderStage, predictionView, predictionStage]);

  async function restoreSession() {
    try {
      const [stored, storedTheme] = await Promise.all([
        SecureStore.getItemAsync("paper-trader-session").catch(() => null),
        SecureStore.getItemAsync("paper-trader-theme").catch(() => null),
      ]);
      if (stored) {
        try {
          setRefreshing(true);
          setSession(JSON.parse(stored));
        } catch {
          setRefreshing(false);
          await SecureStore.deleteItemAsync("paper-trader-session").catch(() => {});
        }
      }
      if (storedTheme && ["system", "light", "dark", "midnight"].includes(storedTheme)) {
        setThemePreferenceState(storedTheme as ThemePreference);
      }
    } finally {
      setChecking(false);
    }
  }

  function setThemePreference(next: ThemePreference) {
    setThemePreferenceState(next);
    SecureStore.setItemAsync("paper-trader-theme", next).catch(() => {});
  }

  async function saveSession(next: Session | null) {
    if (next && !me) setRefreshing(true);
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
    if (APP_STORE_PREVIEW) {
      setRefreshing(false);
      return;
    }
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
      loadPredictionMarkets();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not refresh");
    } finally {
      setRefreshing(false);
      inFlight.current = false;
    }
  }

  async function refreshSelectedMarketData() {
    if (APP_STORE_PREVIEW) {
      setBars(selectedSymbol === "AAPL" ? PREVIEW_BARS : []);
      return;
    }
    const requestedSymbol = selectedSymbol;
    const requestedRange = chartRange;
    const generation = ++marketDataGeneration.current;
    try {
      const [quote, chart] = await Promise.all([
        api<Quote>(`/api/quote?symbol=${encodeURIComponent(requestedSymbol)}`),
        api<{ bars: Bar[] }>(`/api/chart?symbol=${encodeURIComponent(requestedSymbol)}&range=${encodeURIComponent(requestedRange)}`),
      ]);
      if (generation !== marketDataGeneration.current) return;
      setQuotes((prev) => ({ ...prev, [requestedSymbol]: normalizeQuote(quote, requestedSymbol) }));
      setBars(chart.bars ?? []);
      setError("");
    } catch (e) {
      if (generation !== marketDataGeneration.current) return;
      setBars([]);
      setError(e instanceof Error ? e.message : "Market data unavailable");
    }
  }

  async function refreshOrderState() {
    if (APP_STORE_PREVIEW) return { me, quote: selectedQuote };
    const requestedSymbol = selectedSymbol;
    const [nextMe, nextQuote] = await Promise.all([
      api<Me>("/api/me"),
      api<Quote>(`/api/quote?symbol=${encodeURIComponent(requestedSymbol)}`),
    ]);
    const quote = normalizeQuote(nextQuote, requestedSymbol);
    setMe(nextMe);
    setQuotes((previous) => ({ ...previous, [requestedSymbol]: quote }));
    return { me: nextMe, quote };
  }

  function orderValidationError(snapshot: { me: Me | null; quote: Quote | null }) {
    const quotePrice = Number(snapshot.quote?.price ?? 0);
    const price = orderType === "limit" ? Number(limitPrice) : quotePrice;
    const input = Number(amount) || 0;
    const qty = amountMode === "dollars" ? (price > 0 ? input / price : 0) : input;
    const normalizedQty = Math.floor(qty * 10000) / 10000;
    if (!Number.isFinite(quotePrice) || quotePrice <= 0) return "A verified quote is required before reviewing this paper order.";
    if (orderType === "limit" && (!Number.isFinite(price) || price <= 0)) return "Enter a limit price above zero.";
    if (!normalizedQty || normalizedQty <= 0) return "Enter an order amount first.";
    const cash = Number(snapshot.me?.account?.cash ?? 0);
    const ownedQty = Number(snapshot.me?.positions.find((position) => position.symbol === selectedSymbol)?.qty ?? 0);
    if (side === "buy" && normalizedQty * price > cash + 0.005) return "This estimate is above your current simulated buying power. Update the amount and review again.";
    if (side === "sell" && normalizedQty > ownedQty + 0.00005) return "This amount is above your current simulated holdings. Update the amount and review again.";
    return "";
  }

  async function changeOrderStage(next: OrderStage) {
    if (next === "review") {
      setOrderBusy(true);
      setOrderMessage("");
      try {
        const fresh = await refreshOrderState();
        const validationError = orderValidationError(fresh);
        if (validationError) {
          setOrderMessage(validationError);
          setOrderStageState("configure");
          return;
        }
        const nextPrice = orderType === "limit" ? Number(limitPrice) : Number(fresh.quote?.price ?? 0);
        setReviewQuotePrice(nextPrice);
        setReviewClientOrderId(`mobile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);
        setOrderStageState("review");
      } catch (e) {
        setOrderMessage(e instanceof Error ? e.message : "Could not refresh order details.");
        setOrderStageState("configure");
      } finally {
        setOrderBusy(false);
      }
      return;
    }
    if (next === "configure") {
      setReviewQuotePrice(null);
      setReviewClientOrderId(null);
    }
    setOrderStageState(next);
  }

  function resetOrderDraft() {
    setSide("buy");
    setOrderType("market");
    setAmountMode("shares");
    setAmount(APP_STORE_PREVIEW ? "10" : "");
    setLimitPrice("");
    setReviewQuotePrice(null);
    setReviewClientOrderId(null);
    setOrderStageState("configure");
    setOrderMessage("");
    setLastOrder(null);
  }

  async function submitOrder() {
    if (orderSubmitInFlight.current) return;
    orderSubmitInFlight.current = true;
    setOrderBusy(true);
    setOrderMessage("");
    try {
      const fresh = await refreshOrderState();
      const validationError = orderValidationError(fresh);
      if (validationError) {
        setOrderMessage(validationError);
        setOrderStageState("configure");
        setReviewQuotePrice(null);
        return;
      }
      const quotePrice = Number(fresh.quote?.price ?? 0);
      if (orderType === "market" && reviewQuotePrice != null && Math.abs(quotePrice - reviewQuotePrice) >= 0.005) {
        setOrderMessage(`The quote changed from ${reviewQuotePrice.toFixed(2)} to ${quotePrice.toFixed(2)}. Review the updated estimate before confirming.`);
        setOrderStageState("configure");
        setReviewQuotePrice(null);
        return;
      }
      const price = orderType === "limit" ? Number(limitPrice) : quotePrice;
      const input = Number(amount) || 0;
      const qty = amountMode === "dollars" ? input / price : input;
      const normalizedQty = Math.floor(qty * 10000) / 10000;
      const order = APP_STORE_PREVIEW
        ? {
            id: "preview-confirmed-order",
            symbol: selectedSymbol,
            qty: normalizedQty,
            side,
            type: orderType,
            status: "filled",
            filled_avg_price: price,
            created_at: "2026-07-31T20:00:00.000Z",
          } satisfies Order
        : await (async () => {
            setOrderStageState("processing");
            return api<Order>("/api/trade", {
            method: "POST",
            body: JSON.stringify({
              symbol: selectedSymbol,
              qty: normalizedQty,
              side,
              type: orderType,
              limit_price: orderType === "limit" ? Number(limitPrice) : undefined,
              client_order_id: reviewClientOrderId ?? undefined,
            }),
          });
          })();
      if (!APP_STORE_PREVIEW) await refreshAll(false);
      setLastOrder(order);
      setOrderMessage(`${side === "buy" ? "Buy" : "Sell"} paper order ${order.status.replace(/_/g, " ")}. Your simulated portfolio is ready to review.`);
      setOrderStageState("receipt");
      setAmount("");
    } catch (e) {
      setOrderMessage(e instanceof Error ? e.message : "Order failed");
    } finally {
      orderSubmitInFlight.current = false;
      setOrderBusy(false);
    }
  }

  async function loadPredictionMarkets() {
    if (APP_STORE_PREVIEW) {
      setPredictionMarkets(PREVIEW_PREDICTION_MARKETS);
      return;
    }
    setPredictionsLoading(true);
    try {
      const res = await api<{ items: PredictionMarket[] }>("/api/prediction-markets");
      setPredictionMarkets(res.items ?? []);
    } catch {
      // Keep any previously loaded markets; the list surface shows a state panel when empty.
    } finally {
      setPredictionsLoading(false);
    }
  }

  async function loadPredictionHistory(marketId: string, outcome: PredictionOutcome, days: number) {
    if (APP_STORE_PREVIEW) {
      setPredictionHistory(PREVIEW_PREDICTION_HISTORY[marketId] ?? []);
      setPredictionHistoryLoading(false);
      return;
    }
    const generation = ++predictionHistoryGeneration.current;
    setPredictionHistoryLoading(true);
    setPredictionHistory([]);
    try {
      const res = await api<{ items: PredictionHistoryPoint[] }>(
        `/api/prediction-markets/${encodeURIComponent(marketId)}/history?outcome=${outcome}&days=${days}`,
      );
      if (generation !== predictionHistoryGeneration.current) return;
      setPredictionHistory(res.items ?? []);
    } catch {
      if (generation !== predictionHistoryGeneration.current) return;
      setPredictionHistory([]);
    } finally {
      if (generation === predictionHistoryGeneration.current) setPredictionHistoryLoading(false);
    }
  }

  function openMarket(id: string) {
    setSelectedMarketId(id);
    setPredictionView("detail");
    setPredictionOutcome("yes");
    setPredictionMode("buy");
    setPredictionAmount(APP_STORE_PREVIEW ? "25" : "25");
    setPredictionStage("configure");
    setPredictionMessage("");
    setPredictionResult(null);
    setPredictionHistory([]);
  }

  function closeMarket() {
    setPredictionView("list");
    setSelectedMarketId(null);
    setPredictionStage("configure");
    setPredictionMessage("");
    setPredictionResult(null);
  }

  async function submitPrediction() {
    if (predictionSubmitInFlight.current) return;
    const market = predictionMarkets.find((item) => item.id === selectedMarketId);
    if (!market) {
      setPredictionMessage("This prediction market is no longer available.");
      return;
    }
    const isBuy = predictionMode === "buy";
    const price = Number(predictionOutcome === "yes" ? market.yesPrice : market.noPrice) || 0;
    const parsedAmount = Number(predictionAmount) || 0;
    const ownedShares = Number(
      me?.prediction_positions?.find((item) => item.market_id === market.id && item.outcome === predictionOutcome)?.shares ?? 0,
    );
    const sellShares = Math.min(parsedAmount, ownedShares);

    if (isBuy && (price <= 0 || parsedAmount <= 0)) {
      setPredictionMessage("Enter a paper stake above zero to continue.");
      setPredictionStage("configure");
      return;
    }
    if (!isBuy && (sellShares <= 0 || ownedShares <= 0)) {
      setPredictionMessage("You have no shares of this outcome to sell.");
      setPredictionStage("configure");
      return;
    }

    predictionSubmitInFlight.current = true;
    setPredictionBusy(true);
    setPredictionMessage("");
    const clientOrderId = `mobile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    try {
      let result: PredictionTradeResult;
      if (APP_STORE_PREVIEW) {
        const shares = isBuy ? (price > 0 ? parsedAmount / price : 0) : sellShares;
        result = {
          ok: true,
          shares,
          price,
          cost: isBuy ? parsedAmount : undefined,
          proceeds: isBuy ? undefined : sellShares * price,
          outcome: predictionOutcome,
          side: predictionMode,
          question: market.question,
        };
      } else {
        setPredictionStage("processing");
        const closeAll = !isBuy && Math.abs(sellShares - ownedShares) < 0.00001;
        const raw = isBuy
          ? await api<PredictionTradeResult>("/api/predictions/trade", {
              method: "POST",
              body: JSON.stringify({
                market_id: market.id,
                outcome: predictionOutcome,
                stake_usd: parsedAmount,
                client_order_id: clientOrderId,
              }),
            })
          : await api<PredictionTradeResult>("/api/predictions/close", {
              method: "POST",
              body: JSON.stringify({
                market_id: market.id,
                outcome: predictionOutcome,
                shares: closeAll ? undefined : sellShares,
                close_all: closeAll || undefined,
                client_order_id: clientOrderId,
              }),
            });
        result = { ...raw, outcome: predictionOutcome, side: predictionMode, question: market.question };
      }
      if (!APP_STORE_PREVIEW) await refreshAll(false);
      setPredictionResult(result);
      const outcomeLabel = predictionOutcome.toUpperCase();
      setPredictionMessage(
        result.duplicate
          ? `This paper ${isBuy ? "buy" : "sell"} was already recorded. Your simulated position is up to date.`
          : isBuy
            ? `Paper buy ${outcomeLabel} filled. ${Number(result.shares).toFixed(2)} outcome shares added to your simulated portfolio.`
            : `Paper sell ${outcomeLabel} filled. ${Number(result.shares).toFixed(2)} outcome shares closed.`,
      );
      setPredictionStage("receipt");
    } catch (e) {
      setPredictionMessage(e instanceof Error ? e.message : "Your paper order could not be placed.");
      setPredictionStage("review");
    } finally {
      predictionSubmitInFlight.current = false;
      setPredictionBusy(false);
    }
  }

  async function addWatch() {
    if (APP_STORE_PREVIEW) {
      Alert.alert("Watchlist updated", `${selectedSymbol} is already represented in this simulated preview.`);
      return;
    }
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
    if (APP_STORE_PREVIEW) {
      Alert.alert("Paper alert ready", `${selectedSymbol} ${direction} ${target.toFixed(2)} in this simulated preview.`);
      return;
    }
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
    setRefreshing(false);
    setEmail("");
    setPassword("");
    setDisplayName("");
    setSearch("");
    setSearchResult(null);
    setSearchError("");
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
    if (next !== "discover") {
      setDiscoverView("list");
      resetOrderDraft();
    }
    if (next !== "predictions") {
      setPredictionView("list");
      setSelectedMarketId(null);
      setPredictionStage("configure");
    }
    if (next !== "profile") setProfileView("settings");
  }

  function openSymbol(symbol: string) {
    const nextSymbol = symbol.toUpperCase();
    marketDataGeneration.current += 1;
    setSelectedSymbol(nextSymbol);
    setBars(APP_STORE_PREVIEW && nextSymbol === "AAPL" ? PREVIEW_BARS : []);
    setTabState("discover");
    setDiscoverView("detail");
    resetOrderDraft();
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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={resolvedTheme === "light" ? "dark" : "light"} />
      <ScrollView
        ref={scrollRef}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        refreshControl={APP_STORE_PREVIEW ? undefined : <RefreshControl refreshing={refreshing} onRefresh={() => refreshAll(true)} tintColor={colors.brand} />}
        contentContainerStyle={{
          minHeight: "100%",
          paddingLeft: isTablet ? tabletNavWidth + space.x8 : space.x4,
          paddingRight: isTablet ? space.x8 : space.x4,
          paddingTop: isTablet ? space.x8 : space.x6,
          paddingBottom: isTablet ? space.x12 : screenBottomPadding,
          backgroundColor: colors.background,
        }}
      >
        <View style={{ width: "100%", maxWidth: contentMaxWidth, alignSelf: "center", gap: space.x4 }}>
          {error ? <Text selectable accessibilityRole="alert" style={{ color: colors.error, fontSize: 13, lineHeight: 19 }}>{error}</Text> : null}
          {tab === "portfolio" ? (
            <PortfolioScreen me={me} quotes={quotes} openSymbol={openSymbol} goDiscover={() => setTab("discover")} refreshing={refreshing} />
          ) : tab === "discover" ? (
            <DiscoverScreen
              view={discoverView}
              setView={setDiscoverView}
              me={me}
              quotes={quotes}
              selectedSymbol={selectedSymbol}
              setSelectedSymbol={(symbol) => {
                const nextSymbol = symbol.toUpperCase();
                marketDataGeneration.current += 1;
                setSelectedSymbol(nextSymbol);
                setBars(APP_STORE_PREVIEW && nextSymbol === "AAPL" ? PREVIEW_BARS : []);
                resetOrderDraft();
              }}
              bars={bars}
              chartRange={chartRange}
              setChartRange={(nextRange) => {
                marketDataGeneration.current += 1;
                setBars([]);
                setChartRange(nextRange);
              }}
              quote={selectedQuote}
              position={selectedPosition}
              search={search}
              setSearch={setSearch}
              searchResult={searchResult}
              searchLoading={searchLoading}
              searchError={searchError}
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
              orderStage={orderStage}
              setOrderStage={changeOrderStage}
              reviewQuotePrice={reviewQuotePrice}
              lastOrder={lastOrder}
              submitOrder={submitOrder}
              orderBusy={orderBusy}
              orderMessage={orderMessage}
              addWatch={addWatch}
              createAlert={createAlert}
              goPortfolio={() => setTab("portfolio")}
            />
          ) : tab === "compete" ? (
            <CompeteScreen entries={leaderboard} currentAccountId={me?.account?.id} />
          ) : tab === "predictions" ? (
            <PredictionsScreen
              view={predictionView}
              setView={setPredictionView}
              markets={predictionMarkets}
              me={me}
              loading={predictionsLoading}
              selectedMarketId={selectedMarketId}
              openMarket={openMarket}
              closeMarket={closeMarket}
              history={predictionHistory}
              historyLoading={predictionHistoryLoading}
              loadHistory={loadPredictionHistory}
              outcome={predictionOutcome}
              setOutcome={setPredictionOutcome}
              mode={predictionMode}
              setMode={setPredictionMode}
              amount={predictionAmount}
              setAmount={setPredictionAmount}
              stage={predictionStage}
              setStage={setPredictionStage}
              submit={submitPrediction}
              busy={predictionBusy}
              message={predictionMessage}
              lastResult={predictionResult}
              goPortfolio={() => setTab("portfolio")}
            />
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
        </View>
      </ScrollView>
      <BottomNav tab={tab} setTab={setTab} />
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
