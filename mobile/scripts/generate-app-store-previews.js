const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const WIDTH = 1242;
const HEIGHT = 2688;
const OUT_DIR = path.join(__dirname, "..", "store-assets", "app-store", "iphone-6-5");

fs.mkdirSync(OUT_DIR, { recursive: true });

const green = "#22e27b";
const red = "#ff5c6c";
const bg = "#050607";
const panel = "#0b0f12";
const soft = "#8b949e";
const line = "#1b2328";

function money(value) {
  return value;
}

function chartPath(points, x, y, w, h) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  return points
    .map((point, index) => {
      const px = x + (index / (points.length - 1)) * w;
      const py = y + h - ((point - min) / (max - min || 1)) * h;
      return `${index === 0 ? "M" : "L"} ${px.toFixed(1)} ${py.toFixed(1)}`;
    })
    .join(" ");
}

function row({ y, symbol, name, value, change, positive = true }) {
  const color = positive ? green : red;
  return `
    <g transform="translate(126 ${y})">
      <circle cx="36" cy="36" r="30" fill="#11171b" stroke="${line}" />
      <text x="36" y="48" text-anchor="middle" font-size="22" font-weight="800" fill="#f5f7f8">${symbol.slice(0, 1)}</text>
      <text x="86" y="30" font-size="31" font-weight="760" fill="#f7f9fa">${symbol}</text>
      <text x="86" y="68" font-size="22" fill="${soft}">${name}</text>
      <text x="610" y="30" text-anchor="end" font-size="29" font-weight="720" fill="#f7f9fa">${value}</text>
      <text x="610" y="68" text-anchor="end" font-size="22" font-weight="700" fill="${color}">${change}</text>
      <line x1="0" x2="648" y1="98" y2="98" stroke="${line}" />
    </g>`;
}

function stat({ x, y, label, value, accent = "#f7f9fa" }) {
  return `
    <g transform="translate(${x} ${y})">
      <text x="0" y="0" font-size="23" fill="${soft}">${label}</text>
      <text x="0" y="45" font-size="35" font-weight="760" fill="${accent}">${value}</text>
    </g>`;
}

function phoneFrame(content, dark = true) {
  return `
    <g transform="translate(151 430)">
      <rect x="0" y="0" width="940" height="1960" rx="122" fill="#000" />
      <rect x="18" y="18" width="904" height="1924" rx="104" fill="${dark ? "#050607" : "#f8faf8"}" />
      <rect x="372" y="46" width="196" height="54" rx="27" fill="#000" />
      <text x="96" y="84" font-size="28" font-weight="750" fill="${dark ? "#f7f9fa" : "#08100b"}">9:41</text>
      <text x="792" y="84" font-size="26" font-weight="700" fill="${dark ? "#f7f9fa" : "#08100b"}">5G</text>
      <rect x="842" y="60" width="44" height="24" rx="7" fill="none" stroke="${dark ? "#f7f9fa" : "#08100b"}" stroke-width="3" />
      ${content}
    </g>`;
}

function shell({ title, subtitle, phone, accent = green }) {
  return `
  <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <style>
      text { font-family: Inter, Arial, Helvetica, sans-serif; }
    </style>
    <defs>
      <radialGradient id="glow" cx="50%" cy="18%" r="75%">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.18" />
        <stop offset="55%" stop-color="${bg}" stop-opacity="0.98" />
        <stop offset="100%" stop-color="${bg}" />
      </radialGradient>
      <filter id="shadow" x="-25%" y="-10%" width="150%" height="130%">
        <feDropShadow dx="0" dy="34" stdDeviation="42" flood-color="#000" flood-opacity="0.65"/>
      </filter>
      <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="${green}" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="${green}" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#glow)" />
    <text x="96" y="152" font-size="78" font-weight="860" fill="#f7f9fa" letter-spacing="-1">${title}</text>
    <text x="98" y="230" font-size="34" fill="#a3abb2">${subtitle}</text>
    <g filter="url(#shadow)">${phone}</g>
    <text x="621" y="2536" text-anchor="middle" font-size="26" fill="#6f7a82">Paper Trader is for educational paper trading only.</text>
  </svg>`;
}

function portfolio() {
  const chart = chartPath([20, 23, 22, 27, 30, 29, 35, 38, 37, 44, 42, 48, 55, 53, 60], 126, 560, 660, 330);
  const phone = phoneFrame(`
    <text x="92" y="188" font-size="31" fill="${soft}">Good morning, Raine</text>
    <text x="92" y="268" font-size="75" font-weight="860" fill="#f7f9fa">${money("$104,230.18")}</text>
    <text x="94" y="322" font-size="31" font-weight="780" fill="${green}">+$2,431.22 (+2.38%) today</text>
    <path d="${chart} L 786 910 L 126 910 Z" fill="url(#chartFill)" />
    <path d="${chart}" fill="none" stroke="${green}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" />
    <g transform="translate(112 968)">
      ${stat({ x: 0, y: 0, label: "Cash", value: "$18,204" })}
      ${stat({ x: 300, y: 0, label: "Invested", value: "$86,026" })}
      ${stat({ x: 595, y: 0, label: "Holdings", value: "8" })}
    </g>
    <text x="92" y="1168" font-size="42" font-weight="820" fill="#f7f9fa">Holdings</text>
    ${row({ y: 1212, symbol: "AAPL", name: "Apple Inc.", value: "$12,430", change: "+1.8%" })}
    ${row({ y: 1340, symbol: "NVDA", name: "NVIDIA", value: "$9,182", change: "+3.2%" })}
    ${row({ y: 1468, symbol: "TSLA", name: "Tesla", value: "$5,040", change: "-0.7%", positive: false })}
    <text x="92" y="1664" font-size="42" font-weight="820" fill="#f7f9fa">Account pulse</text>
    <text x="92" y="1722" font-size="26" fill="${soft}">Top 3 holdings are 42% of your account</text>
    <rect x="92" y="1804" width="756" height="86" rx="43" fill="#0f1713" stroke="#173b27" />
    <text x="142" y="1858" font-size="30" font-weight="780" fill="${green}">Balanced cash buffer</text>
  `);
  return shell({
    title: "Portfolio clarity",
    subtitle: "Track performance, holdings, and activity at a glance.",
    phone,
  });
}

function discovery() {
  const smallChart = chartPath([12, 18, 15, 22, 24, 21, 30, 36, 34, 42], 520, 760, 252, 120);
  const phone = phoneFrame(`
    <text x="92" y="200" font-size="62" font-weight="860" fill="#f7f9fa">Find Stocks</text>
    <rect x="92" y="264" width="756" height="76" rx="38" fill="#0d1215" stroke="${line}" />
    <text x="146" y="313" font-size="27" fill="#76818a">Search symbols, companies, or sectors</text>
    <text x="92" y="438" font-size="29" font-weight="780" fill="#f7f9fa">Popular today</text>
    <g transform="translate(92 484)">
      <rect x="0" y="0" width="166" height="72" rx="36" fill="#102017" stroke="#173b27" />
      <text x="83" y="46" text-anchor="middle" font-size="28" font-weight="760" fill="${green}">NVDA</text>
      <rect x="184" y="0" width="158" height="72" rx="36" fill="#0d1215" stroke="${line}" />
      <text x="263" y="46" text-anchor="middle" font-size="28" font-weight="760" fill="#f7f9fa">AAPL</text>
      <rect x="360" y="0" width="154" height="72" rx="36" fill="#0d1215" stroke="${line}" />
      <text x="437" y="46" text-anchor="middle" font-size="28" font-weight="760" fill="#f7f9fa">SPY</text>
    </g>
    <text x="92" y="666" font-size="32" font-weight="760" fill="#f7f9fa">NVIDIA Corporation</text>
    <text x="92" y="746" font-size="92" font-weight="880" fill="#f7f9fa">NVDA</text>
    <text x="92" y="826" font-size="58" font-weight="830" fill="${green}">$120.50</text>
    <text x="92" y="878" font-size="30" font-weight="760" fill="${green}">+3.85 (+3.30%)</text>
    <path d="${smallChart}" fill="none" stroke="${green}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" />
    <line x1="92" x2="848" y1="990" y2="990" stroke="${line}" />
    <g transform="translate(92 1070)">
      ${stat({ x: 0, y: 0, label: "Open", value: "$117.15" })}
      ${stat({ x: 252, y: 0, label: "High", value: "$122.15" })}
      ${stat({ x: 504, y: 0, label: "Volume", value: "78.9M" })}
    </g>
    <text x="92" y="1310" font-size="42" font-weight="820" fill="#f7f9fa">Watchlist</text>
    ${row({ y: 1354, symbol: "MSFT", name: "Microsoft", value: "$375.50", change: "+1.1%" })}
    ${row({ y: 1482, symbol: "QQQ", name: "Nasdaq ETF", value: "$437.12", change: "+0.9%" })}
    <rect x="92" y="1712" width="756" height="96" rx="48" fill="${green}" />
    <text x="470" y="1772" text-anchor="middle" font-size="32" font-weight="880" fill="#021007">TRADE</text>
  `);
  return shell({
    title: "Find trades faster",
    subtitle: "Search, watch, and inspect tickers without clutter.",
    phone,
  });
}

function competition() {
  const phone = phoneFrame(`
    <text x="92" y="200" font-size="58" font-weight="860" fill="#f7f9fa">Competitions</text>
    <text x="94" y="250" font-size="27" fill="${soft}">Global paper trading leaderboard</text>
    <rect x="92" y="326" width="756" height="158" rx="36" fill="#0c1113" stroke="${line}" />
    <text x="132" y="386" font-size="26" fill="${soft}">Club Sandbox</text>
    <text x="132" y="436" font-size="40" font-weight="820" fill="#f7f9fa">Spring Season</text>
    <text x="654" y="436" text-anchor="end" font-size="32" font-weight="780" fill="${green}">+12.4%</text>
    <text x="92" y="604" font-size="42" font-weight="820" fill="#f7f9fa">Rankings</text>
    ${row({ y: 652, symbol: "1", name: "Sarah Chen", value: "$11,540", change: "+15.4%" })}
    ${row({ y: 780, symbol: "2", name: "Alex Kim", value: "$11,210", change: "+12.1%" })}
    ${row({ y: 908, symbol: "3", name: "Maria Garcia", value: "$10,980", change: "+9.8%" })}
    ${row({ y: 1036, symbol: "4", name: "You", value: "$10,420", change: "+7.5%" })}
    <text x="92" y="1262" font-size="42" font-weight="820" fill="#f7f9fa">Settings</text>
    <g transform="translate(92 1320)">
      <line x1="0" x2="756" y1="0" y2="0" stroke="${line}" />
      <text x="0" y="64" font-size="31" font-weight="730" fill="#f7f9fa">API keys</text>
      <text x="756" y="64" text-anchor="end" font-size="31" fill="${soft}">Manage</text>
      <line x1="0" x2="756" y1="104" y2="104" stroke="${line}" />
      <text x="0" y="168" font-size="31" font-weight="730" fill="#f7f9fa">Appearance</text>
      <text x="756" y="168" text-anchor="end" font-size="31" fill="${green}">Dark</text>
      <line x1="0" x2="756" y1="208" y2="208" stroke="${line}" />
      <text x="0" y="272" font-size="31" font-weight="730" fill="#f7f9fa">Admin access</text>
      <text x="756" y="272" text-anchor="end" font-size="31" fill="${soft}">Users</text>
    </g>
    <rect x="92" y="1748" width="756" height="94" rx="47" fill="#0f1713" stroke="#173b27" />
    <text x="470" y="1806" text-anchor="middle" font-size="29" font-weight="790" fill="${green}">Secure paper-trading workspace</text>
  `);
  return shell({
    title: "Compete with friends",
    subtitle: "Leaderboards, settings, and account controls in one place.",
    phone,
  });
}

async function write(name, svg) {
  const file = path.join(OUT_DIR, name);
  await sharp(Buffer.from(svg)).png().toFile(file);
  const meta = await sharp(file).metadata();
  console.log(`${file} ${meta.width}x${meta.height}`);
}

async function main() {
  await write("01-portfolio-clarity.png", portfolio());
  await write("02-find-trades-faster.png", discovery());
  await write("03-compete-and-control.png", competition());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
