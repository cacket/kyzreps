import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

const PORT = process.env.PORT || 3002;
const DATA_DIR = path.join(__dirname, 'data');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://challenges.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.uufinds.com", "https://qcitems.com"],
      frameSrc: ["https://challenges.cloudflare.com"],
      upgradeInsecureRequests: isProduction ? [] : null,
    }
  },
  crossOriginEmbedderPolicy: false,
  strictTransportSecurity: isProduction ? undefined : false,
}));

const CORS_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3002')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (CORS_ORIGINS.includes(origin)) return callback(null, true);
    callback(null, false);
  },
  credentials: true,
}));

if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 100,




  skip: req => req.method === 'GET' && req.path.startsWith('/api/'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zbyt wiele zapytań, spróbuj za chwilę' },
}));

const apiReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 240,
  standardHeaders: true,
  legacyHeaders: false,
  skip: req => req.path === '/img' || req.path === '/image/resolve',
  message: { error: 'Zbyt wiele zapytań, spróbuj za chwilę' },
});
app.use('/api', apiReadLimiter);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zbyt wiele prób logowania, spróbuj za 15 minut' },
});

const oauthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zbyt wiele prób logowania, spróbuj później' },
});

const outfitLikeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zbyt wiele lajków, spróbuj za chwilę' },
});

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.set('trust proxy', 1);

function sameOriginMutation(req, res, next) {
  if (req.baseUrl === '/api/admin' || req.baseUrl === '/api/auth' || req.path.startsWith('/admin') || req.path.startsWith('/auth')) {
    res.setHeader('Cache-Control', 'no-store');
  }
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (origin && !CORS_ORIGINS.includes(origin)) return res.status(403).json({ error: 'Origin not allowed' });
  next();
}

app.use('/api/admin', sameOriginMutation);
app.use('/api/auth', sameOriginMutation);
app.use('/api/outfits', sameOriginMutation);
app.use('/api/favorites', sameOriginMutation);

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function readJSON(name, fallback) {
  const p = path.join(DATA_DIR, name + '.json');
  if (!fs.existsSync(p)) {
    fs.writeFileSync(p, JSON.stringify(fallback, null, 2));
    return fallback;
  }
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    return fallback;
  }
}

function writeJSON(name, data) {
  fs.writeFileSync(path.join(DATA_DIR, name + '.json'), JSON.stringify(data, null, 2));
}

const SHEET1_ID = process.env.SHEET1_ID || '';
const SHEET2_ID = process.env.SHEET2_ID || '';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';
const GOOGLE_API_KEY_2 = process.env.GOOGLE_API_KEY_2 || '';
const GOOGLE_API_KEYS = [GOOGLE_API_KEY, GOOGLE_API_KEY_2].filter(Boolean);

if (!GOOGLE_API_KEY) console.warn('GOOGLE_API_KEY not set, falling back to CSV');

let gKeyIdx = 0;

const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET1_ID}/gviz/tq?tqx=out:csv&gid=0`;
const SHEET2_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET2_ID}/gviz/tq?tqx=out:csv&gid=0`;

function apiGridUrl(sheetId, range, includeGridData = true) {
  const r = range ? `&ranges=${encodeURIComponent(range)}` : '';
  const key = GOOGLE_API_KEYS[gKeyIdx % GOOGLE_API_KEYS.length];
  return `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?key=${key}&includeGridData=${includeGridData ? 'true' : 'false'}${r}`;
}

const sheetConfig = readJSON('sheets', { sheets: [] });

function extractSheetId(url) {
  const m = String(url || '').match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : url;
}

const SHEET_SOURCES = (sheetConfig.sheets || []).map((s, index) => {
  const safeTab = (s.tab || '').replace(/'/g, "''");
  const sourceUrl = String(s.url || s.id || '');
  let gid = String(s.gid || '');
  try {
    const parsed = new URL(sourceUrl);
    gid = gid || parsed.searchParams.get('gid') || (parsed.hash.match(/gid=(\d+)/i)?.[1] || '');
  } catch {}



  const tabText = `${s.tab || ''} ${sourceUrl}`.toLowerCase();
  const inferredGender = s.gender || (
    /women|woman|female|ladies|damsk|kobie/.test(tabText) ? 'women' :
    (/men|male|męsk|mesk/.test(tabText) ? 'men' : (index === 0 ? 'men' : 'women'))
  );
  return {
    id: extractSheetId(sourceUrl),
    range: s.range || (safeTab ? `'${safeTab}'!A1:F3500` : 'A1:F3500'),
    cols: s.cols || { name: 1, img: 0, usd: 2, raw: 3, batch: 4, rating: 5 },
    sections: s.sections !== undefined ? !!s.sections : true,
    gender: inferredGender,
    csvUrl: `https://docs.google.com/spreadsheets/d/${extractSheetId(sourceUrl)}/gviz/tq?tqx=out:csv&gid=${encodeURIComponent(gid || '0')}`,
  };
});

function normalizeSheetGender(value) {
  const normalized = String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (/women|woman|female|lad(y|ies)|girl|damsk|kobie/.test(normalized)) return 'women';
  if (/men|male|man|boy|mesk|chlop/.test(normalized)) return 'men';
  if (normalized === 'unisex') return 'unisex';
  return 'auto';
}

function normalizeSheetCategory(value) {
  const category = String(value || '').trim().slice(0, 40);
  return category || 'auto';
}

function sheetCellValue(cell) {
  return String(cell?.formattedValue || cell?.userEnteredValue?.stringValue || cell?.userEnteredValue?.numberValue || '').trim();
}

function normalizeSheetHeader(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function detectSheetColumns(rowData) {
  const defaults = { name: 1, img: 0, usd: 2, raw: 3, batch: 4, rating: 5 };
  const aliases = {
    name: [/^name$/, /product/, /item/, /title/, /nazwa/],
    img: [/image/, /photo/, /picture/, /img/, /zdjec/, /foto/],
    usd: [/usd/, /dollar/, /price/, /ceny/, /cena/],
    pln: [/pln/, /zl/, /zlot/],
    raw: [/link/, /url/, /shop/, /product link/, /buy/],
    batch: [/batch/, /version/, /quality/],
    rating: [/rating/, /opinion/, /review/, /ocena/, /score/],
  };

  let best = { score: 0, row: -1, headers: [] };
  for (let rowIndex = 0; rowIndex < Math.min(100, rowData.length); rowIndex++) {
    const headers = (rowData[rowIndex]?.values || []).map(sheetCellValue);
    const normalized = headers.map(normalizeSheetHeader);
    let score = 0;
    for (const patterns of Object.values(aliases)) {
      if (normalized.some(header => patterns.some(pattern => pattern.test(header)))) score++;
    }
    if (score > best.score) best = { score, row: rowIndex, headers: normalized };
  }

  if (best.score < 2) return { cols: defaults, headerRow: null, confidence: 0 };

  const cols = { ...defaults };
  for (const [field, patterns] of Object.entries(aliases)) {
    const index = best.headers.findIndex(header => patterns.some(pattern => pattern.test(header)));
    if (index >= 0) cols[field] = index;
  }
  if (cols.pln === cols.usd) delete cols.pln;
  return { cols, headerRow: best.row + 1, confidence: Math.min(1, best.score / 7) };
}

function inferSheetGender(tab, sourceUrl, index = 0) {
  const text = `${tab || ''} ${sourceUrl || ''}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (/women|woman|female|lad(y|ies)|girl|damsk|kobie/.test(text)) return 'women';
  if (/men|male|man|boy|mesk|chlop/.test(text)) return 'men';
  return index === 0 ? 'men' : 'auto';
}

function columnName(index) {
  let value = '';
  let number = Math.max(0, Number(index) || 0) + 1;
  while (number > 0) {
    const remainder = (number - 1) % 26;
    value = String.fromCharCode(65 + remainder) + value;
    number = Math.floor((number - 1) / 26);
  }
  return value;
}

async function inspectGoogleSpreadsheet(sheetId, sourceUrl) {
  if (!GOOGLE_API_KEYS.length) throw new Error('GOOGLE_API_KEY is not configured');

  const metadata = JSON.parse(await fetchSheet(apiGridUrl(sheetId, '', false)));
  const spreadsheetTitle = String(metadata.properties?.title || 'Google Sheets');
  const tabs = Array.isArray(metadata.sheets) ? metadata.sheets : [];
  const detected = [];

  for (let index = 0; index < tabs.length; index++) {
    const properties = tabs[index].properties || {};
    const tab = String(properties.title || '').trim();
    if (!tab) continue;
    const escapedTab = tab.replace(/'/g, "''");
    const sampleRange = `'${escapedTab}'!A1:Z100`;
    const sample = JSON.parse(await fetchSheet(apiGridUrl(sheetId, sampleRange)));
    const rowData = sample.sheets?.[0]?.data?.[0]?.rowData || [];
    const detection = detectSheetColumns(rowData);
    const meaningfulRows = rowData.filter(row => (row.values || []).some(cell => sheetCellValue(cell))).length;
    const gender = inferSheetGender(tab, sourceUrl, index);

    detected.push({
      gid: String(properties.sheetId ?? 0),
      tab,
      gender,
      category: 'auto',
      range: `'${escapedTab}'!A1:${columnName(Math.max(5, (properties.gridProperties?.columnCount || 6) - 1))}3500`,
      cols: detection.cols,
      headerRow: detection.headerRow,
      confidence: detection.confidence,
      sections: true,
      hasData: meaningfulRows > 0,
    });
  }

  return { spreadsheetTitle, spreadsheetId: sheetId, sheets: detected };
}

function getConfiguredSheetSources() {
  const config = readJSON('sheets', { sheets: [] });
  const sheets = Array.isArray(config.sheets) ? config.sheets : [];
  return sheets.map((s, index) => {
    const sourceUrl = String(s.url || s.id || '').trim();
    const sheetId = extractSheetId(sourceUrl);
    const safeTab = String(s.tab || '').replace(/'/g, "''");
    let gid = String(s.gid || '');
    try {
      const parsed = new URL(sourceUrl);
      gid = gid || parsed.searchParams.get('gid') || (parsed.hash.match(/gid=(\d+)/i)?.[1] || '');
    } catch {}

    const text = `${s.tab || ''} ${sourceUrl}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const selectedGender = normalizeSheetGender(s.gender);
    const gender = selectedGender !== 'auto' ? selectedGender : (
      /women|woman|female|lad(y|ies)|girl|damsk|kobie/.test(text) ? 'women' :
      (/men|male|man|boy|mesk|chlop/.test(text) ? 'men' : 'auto')
    );

    return {
      key: String(s.key || `legacy-${index}`),
      id: sheetId,
      url: sourceUrl,
      tab: String(s.tab || '').trim().slice(0, 120),
      gid,
      range: s.range || (safeTab ? `'${safeTab}'!A1:F3500` : 'A1:F3500'),
      cols: s.cols || { name: 1, img: 0, usd: 2, raw: 3, batch: 4, rating: 5 },
      sections: s.sections !== undefined ? !!s.sections : true,
      gender,
      category: normalizeSheetCategory(s.category),
      csvUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${encodeURIComponent(gid || '0')}`,
    };
  }).filter(source => source.id && source.id !== source.url && /^https?:\/\/docs\.google\.com\/spreadsheets\/d\//i.test(source.url));
}

const IMG_CACHE_FILE = path.join(__dirname, 'data', 'imgcache.json');
let imgCacheMap = {};
try { imgCacheMap = JSON.parse(fs.readFileSync(IMG_CACHE_FILE, 'utf8')); } catch {}

function saveImgCache() {
  try { fs.writeFileSync(IMG_CACHE_FILE, JSON.stringify(imgCacheMap)); } catch {}
}

function stripResolutionSuffix(url) {


  return String(url || '').replace(
    /_\d{2,4}_\d{2,4}(\.(?:jpg|jpeg|png|webp|gif))([^?]*)?(\?.*)?$/i,
    '_800_800$1$2$3',
  );
}

function extractImageUrl(cell) {
  if (!cell) return '';

  const formula = cell.userEnteredValue?.formulaValue || '';
  const formulaMatch = formula.match(/IMAGE\(\s*["']([^"']+)["']/i);
  if (formulaMatch) {
    let u = formulaMatch[1].trim();
    if (u.startsWith('//')) u = 'https:' + u;
    return unwrapImgProxy(u);
  }

  const hl = cell.hyperlink || '';
  if (/\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(hl) || /postimg\.cc|iili\.io/i.test(hl)) {
    let u = hl.trim();
    if (u.startsWith('//')) u = 'https:' + u;
    return unwrapImgProxy(u);
  }

  const v = (cell.userEnteredValue?.stringValue || cell.formattedValue || '').trim();
  const vv = v.startsWith('//') ? 'https:' + v : v;
  if (!vv.startsWith('http')) return '';

  const unwrapped = unwrapImgProxy(vv);
  if (/\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(unwrapped)) return unwrapped;
  if (/^https?:\/\/.*(geilicdn|weidian|taobao|alicdn|1688|topbuyin|bolobuy|chiobet|acbuy|uufinds|kakobuy|cnshopper|postimg\.cc|iili\.io)/i.test(unwrapped)) {
    return unwrapped;
  }

  return '';
}

function unwrapImgProxy(url) {
  try {
    const u = new URL(url);

    if (/topbuyin\.com/i.test(u.hostname) && u.searchParams.has('url')) {
      const inner = decodeURIComponent(u.searchParams.get('url'));
      if (inner.startsWith('http')) return inner;
    }

    const inner = u.searchParams.get('url');
    if (inner && /^https?:\/\/.+(geilicdn|bolobuy|chiobet|alicdn|weidian|acbuy)/i.test(inner)) {
      return decodeURIComponent(inner);
    }
  } catch {}
  return url;
}

async function weidianImage(itemId) {
  const weidianUrl = `https://weidian.com/item.html?itemID=${itemId}`;
  const kakoUrl = `https://www.kakobuy.com/item/details?url=${encodeURIComponent(weidianUrl)}&affcode=kyzreps`;

  try {
    const convRes = await fetch(
      `https://api.uufinds.com/open/api/convertUrl?from=kyzreps&url=${encodeURIComponent(kakoUrl)}`,
      { signal: AbortSignal.timeout(12000) }
    );
    const conv = await convRes.json();
    if (!conv.success || !conv.result?.url) return null;

    const goodsId = (() => {
      try {
        const m = new URL(conv.result.url).pathname.match(/goodItemDetail\/(?:qc|uu)\/([^/?#]+)/);
        return m ? m[1] : null;
      } catch { return null; }
    })();
    if (!goodsId) return null;

    const detailRes = await fetch(
      `https://api.uufinds.com/goods/detail/${goodsId}`,
      { headers: { 'X-Client-Type': 'web', 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) }
    );
    if (!detailRes.ok) return null;

    const detail = await detailRes.json();
    const img = detail?.result?.majorImg || detail?.result?.imageList?.[0];
    if (!img) return null;

    return img.startsWith('//') ? 'https:' + img : img;
  } catch {
    return null;
  }
}

function unwrapAgentUrl(raw) {
  try {
    const u = new URL(raw);
    const agentHosts = /kakobuy|cnshopper|usfans|litbuy|oosbuy|ossbuy|gtbuy|hoobuy|pandabuy|acbuy|oopbuy|orientdig|cnfans|superbuy|sugargoo|basetao|lovegobuy|mulebuy|ezbuy|hubbuy|joybuy|manbuy|topbuy|westbuy|rownsneak|supplyment|dhgate|westock/i;
    const shopHosts = /weidian\.com|1688\.com|taobao\.com|tmall\.com|item\.taobao/i;

    if (agentHosts.test(u.hostname)) {
      const inner = u.searchParams.get('url') || u.searchParams.get('platformUrl') || u.searchParams.get('goodsUrl');
      if (inner) return inner;
    }
    if (!shopHosts.test(u.hostname)) {
      const inner = u.searchParams.get('url') || u.searchParams.get('platformUrl') || u.searchParams.get('goodsUrl');
      if (inner && /^https?:\/\//.test(inner) && !agentHosts.test(new URL(inner).hostname)) return inner;
    }
  } catch {}
  return raw;
}

function appendAff(url) {
  try {
    const u = new URL(url);
    if (/kakobuy\.com$/.test(u.hostname)) u.searchParams.set('affcode', 'kyzreps');
    return u.toString();
  } catch {
    return url;
  }
}

const SECTION_MAP = {
  'shoes': 'Buty',
  'sliders': 'Buty',
  'sneakers': 'Buty',
  'boots': 'Buty',
  'basketball shoes': 'Buty',
  'football shoes': 'Buty',
  'longsleeves': 'Longsleeve',
  'longsleeve': 'Longsleeve',
  'longsleves': 'Longsleeve',
  'coats/jackets': 'Kurtki',
  'jacket': 'Kurtki',
  'jackets': 'Kurtki',
  'vest': 'Kurtki',
  'windbreaker': 'Kurtki',
  'coats': 'Kurtki',
  'hoodies': 'Bluzy',
  'hoodie': 'Bluzy',
  '( hoodies ) sweater': 'Bluzy',
  'sweaters': 'Bluzy',
  'crewnecks': 'Bluzy',
  'sweatshirts': 'Bluzy',
  't-shirts': 'Koszulki',
  't-shirt': 'Koszulki',
  'shirts': 'Koszulki',
  'polo': 'Koszulki',
  'shirts & polo t-shirts': 'Koszulki',
  'tops': 'Koszulki',
  'jerseys': 'Koszulki',
  'shorts': 'Spodenki',
  'short': 'Spodenki',
  'swim shorts': 'Spodenki',
  'jeans': 'Spodnie',
  'sweatpants': 'Spodnie',
  'pants': 'Spodnie',
  'trousers': 'Spodnie',
  'cargo': 'Spodnie',
  'trackpants': 'Spodnie',
  'tracksuits': 'Inne',
  'dresses': 'Inne',
  'skirts': 'Inne',
  'sets': 'Inne',
  'best seller': 'Inne',
  'lego': 'Inne',
  'room deco': 'Inne',
  'sports clothing': 'Inne',
  'alo': 'Inne',
  'zara': 'Inne',
  'lululemon': 'Inne',
  'accessories': 'Akcesoria',
  'accesories+': 'Akcesoria',
  'accessory': 'Akcesoria',
  'shoe accessories': 'Akcesoria',
  'belts': 'Pasy',
  'socks': 'Akcesoria',
  'scarfs': 'Akcesoria',
  'wallets': 'Akcesoria',
  'sunglasses': 'Akcesoria',
  'jewelry': 'Akcesoria',
  'underwear': 'Akcesoria',
  'watches': 'Akcesoria',
  'perfume': 'Akcesoria',
  'electronics': 'Elektronika',
  'hats': 'Nakrycie głowy',
  'caps': 'Nakrycie głowy',
  'beanies': 'Nakrycie głowy',
  'bags': 'Torby i plecaki',
  'backpacks': 'Torby i plecaki',
};

function catFromName(name) {
  const n = name.toLowerCase();
  if (/\bshort[s]?\b|swim short|cargo short|swim trunk/i.test(n)) return 'Spodenki';
  if (/hoodie|hoodys|bluza|fleece|crewneck|sweatshirt|sweater/i.test(n)) return 'Bluzy';
  if (/longsleeve|long.?sleeve|long sleeve/i.test(n)) return 'Longsleeve';
  if (/\btee\b|t-shirt|koszulk|polo|tank top|\btop\b/i.test(n)) return 'Koszulki';
  if (/jacket|kurtka|puffer|\bvest\b|gilet|outerwear|shell|windbreaker|down jacket|rain jacket/i.test(n)) return 'Kurtki';
  if (/\bpant[s]?\b|spodnie|jeans|cargo pant|trackpant|jogger|sweatpant|trouser|legging/i.test(n)) return 'Spodnie';
  if (/shoe|sneaker|jordan|dunk|yeezy|new balance|air max|air force|samba|adizero|\bboot[s]?\b|\bslide[s]?\b|sandal|clog/i.test(n)) return 'Buty';
  if (/\bhat[s]?\b|\bcap[s]?\b|beanie|bucket hat|balaclava|headwear|czapka/i.test(n)) return 'Nakrycie głowy';
  if (/\bbag[s]?\b|backpack|plecak|tote|shoulder bag|waist bag|fanny/i.test(n)) return 'Torby i plecaki';
  if (/\bbelt[s]?\b|pasek/i.test(n)) return 'Pasy';
  if (/sock[s]?\b|skarpet/i.test(n)) return 'Akcesoria';
  if (/watch|zegarek|sunglass|okular|wallet|portfel|keychain|jewel|necklace|ring\b|perfum/i.test(n)) return 'Akcesoria';
  if (/airpod|headphone|speaker|charger|phone case/i.test(n)) return 'Elektronika';
  if (/set\b|suit\b|track.?set|matching|dress|skirt/i.test(n)) return 'Inne';
  return 'Inne';
}

function brandFromName(name) {
  const n = name.toLowerCase();
  const brands = [
    [/nike|air jordan|jordan|dunk|air max|air force|tech fleece/, 'Nike'],
    [/adidas|yeezy|samba|gazelle|adizero/, 'Adidas'],
    [/new balance/, 'New Balance'],
    [/trapstar/, 'Trapstar'],
    [/corteiz/, 'Corteiz'],
    [/essentials|fear of god/, 'Essentials'],
    [/stussy|stüssy/, 'Stussy'],
    [/supreme/, 'Supreme'],
    [/arc'teryx|arcteryx/, "Arc'teryx"],
    [/north face/, 'The North Face'],
    [/carhartt/, 'Carhartt'],
    [/palm angels/, 'Palm Angels'],
    [/bape/, 'Bape'],
    [/moncler/, 'Moncler'],
    [/off-white|off white/, 'Off-White'],
    [/gucci/, 'Gucci'],
    [/louis vuitton|lv/, 'Louis Vuitton'],
    [/champion/, 'Champion'],
    [/under armour|underarmor/, 'Under Armour'],
    [/reebok/, 'Reebok'],
    [/puma/, 'Puma'],
    [/levi/, "Levi's"],
    [/dior/, 'Dior'],
    [/balenciaga/, 'Balenciaga'],
    [/versace/, 'Versace'],
    [/tommy/, 'Tommy Hilfiger'],
    [/ralph lauren/, 'Ralph Lauren'],
    [/kaws/, 'Kaws'],
    [/lego/, 'LEGO'],
    [/bearbrick/, 'Bearbrick'],
    [/gymshark/, 'Gymshark'],
    [/syna world/, 'Syna World'],
    [/pocket skeleton/, 'Pocket Skeleton'],
    [/eren/, 'ERD'],
    [/rhude/, 'Rhude'],
    [/ugg/, 'UGG'],
    [/birkenstock/, 'Birkenstock'],
    [/salomon/, 'Salomon'],
    [/vans/, 'Vans'],
    [/converse/, 'Converse'],
    [/crocs/, 'Crocs'],
    [/asics/, 'Asics'],
    [/timberland/, 'Timberland'],
    [/burberry/, 'Burberry'],
    [/prada/, 'Prada'],
    [/hermes/, 'Hermes'],
    [/saint laurent|ysl/, 'Saint Laurent'],
    [/maison margiela/, 'Maison Margiela'],
    [/rick owens/, 'Rick Owens'],
    [/zara/, 'Zara'],
    [/lululemon/, 'Lululemon'],
    [/alo/, 'Alo'],
  ];
  for (const [re, brand] of brands) {
    if (re.test(n)) return brand;
  }
  return '';
}

function extractCellLink(cell) {
  if (!cell) return '';
  if (cell.hyperlink) return cell.hyperlink.trim();
  const formula = cell.userEnteredValue?.formulaValue || '';
  if (formula) {
    const m = formula.match(/HYPERLINK\(\s*["']([^"']+)["']/i);
    if (m) return m[1].trim();
  }
  const sv = (cell.userEnteredValue?.stringValue || cell.formattedValue || '').trim();
  if (/^https?:\/\//i.test(sv)) return sv;
  return '';
}

function parseApiSheet(json, src) {
  const products = [];
  const colName = src.cols?.name ?? 1;
  const colImg = src.cols?.img ?? 0;
  const colUsd = src.cols?.usd ?? 2;
  const colPln = src.cols?.pln;
  const colRaw = src.cols?.raw ?? src.cols?.link ?? src.cols?.kakobuy ?? 3;
  const colBatch = src.cols?.batch ?? 4;
  const colRating = src.cols?.rating ?? src.cols?.opinion ?? 5;

  for (const sheet of json.sheets || []) {
    for (const grid of sheet.data || []) {
      const rows = grid.rowData || [];
      let currentSection = 'Buty';

      for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].values || [];
        const val = (c) => cells[c]?.formattedValue?.trim() || '';

        const c0 = val(0);
        const c1 = val(1);
        const c2 = val(colUsd);


        const priceNum = colPln !== undefined ? cleanPrice(val(colPln)) : cleanPrice(c2);
        const rawLinkCandidate = extractCellLink(cells[colRaw]);

        if (src.sections && !priceNum && (!rawLinkCandidate || rawLinkCandidate.startsWith('#'))) {
          const rawHeader = (c0 || c1 || '').toLowerCase().trim();
          const cleanKey = rawHeader.replace(/^[★🌍⚽\s]+|[★🏆⚽\s]+$/g, '').trim();
          if (SECTION_MAP[cleanKey] || SECTION_MAP[rawHeader]) {
            currentSection = SECTION_MAP[cleanKey] || SECTION_MAP[rawHeader];
            continue;
          }
        }

        const name = val(colName).replace(/\s+/g, ' ');
        const pln = colPln !== undefined ? cleanPrice(val(colPln)) : 0;
        const usd = colUsd !== undefined ? cleanPrice(val(colUsd)) : 0;
        const price = pln || Math.round(usd * 4.18 * 100) / 100;
        if (!name || name.length < 2 || !price || !Number.isFinite(price) || price > 10000) continue;

        let rawLink = '';
        let fallbackBuyUrl = '';

        if (rawLinkCandidate && !rawLinkCandidate.startsWith('#')) {
          const unwrapped = unwrapAgentUrl(rawLinkCandidate);
          if (/weidian\.com|taobao\.com|1688\.com|tmall\.com/i.test(unwrapped)) {
            rawLink = unwrapped;
          } else if (/weidian\.com|taobao\.com|1688\.com|tmall\.com/i.test(rawLinkCandidate)) {
            rawLink = rawLinkCandidate;
          } else {
            fallbackBuyUrl = appendAff(rawLinkCandidate);
          }
        }

        const img = colImg !== undefined ? extractImageUrl(cells[colImg]) : '';
        const batch = colBatch !== undefined ? val(colBatch) : '';
        const ratingRaw = colRating !== undefined ? val(colRating) : '';
        let rating = 7;
        if (ratingRaw) {
          const m = ratingRaw.match(/(\d+)(?:\s*\/\s*10)?/);
          if (m) {
            const p = parseInt(m[1], 10);
            if (!isNaN(p) && p >= 1 && p <= 10) rating = p;
          }
        }

        const detectedCategory = src.sections
          ? (currentSection && currentSection !== 'Inne' ? currentSection : catFromName(name))
          : catFromName(name);
        const cat = src.category && src.category !== 'auto' ? src.category : detectedCategory;

        products.push({
          title: name,
          price,
          platform: 'Weidian',
          rating,
          cat,
          img,
          description: name,
          brand: brandFromName(name),
          buyUrl: rawLink
            ? `https://www.ossbuy.com/item?url=${encodeURIComponent(rawLink)}`
            : (fallbackBuyUrl || (rawLinkCandidate && !rawLinkCandidate.startsWith('#') ? appendAff(rawLinkCandidate) : '')),
          rawUrl: rawLink || (rawLinkCandidate && !rawLinkCandidate.startsWith('#') ? rawLinkCandidate : ''),
          batch: batch || undefined,
          gender: src.gender === 'auto' ? undefined : src.gender,
        });
      }
    }
  }
  return products;
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { row.push(field); field = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(field); field = '';
        rows.push(row); row = [];
      } else {
        field += ch;
      }
    }
  }

  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function cleanPrice(s) {
  if (!s) return 0;
  s = s.replace(/[^\d.,]/g, '').replace(',', '.');
  return parseFloat(s) || 0;
}

function parseSheet2(csvText) {
  const rows = parseCSV(csvText);
  const products = [];
  let currentSection = 'Inne';

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    const name = (row[0] || '').replace(/\s+/g, ' ').trim();

    if (name && row.length >= 5 && !row[2] && !row[3]) {
      const key = name.toLowerCase().trim();
      if (SECTION_MAP[key]) { currentSection = SECTION_MAP[key]; continue; }
    }

    const priceUSD = cleanPrice(row[2] || '');
    if (!name || name.length < 2 || !priceUSD || !Number.isFinite(priceUSD) || priceUSD > 2500) continue;

    products.push({
      title: name,
      price: Math.round(priceUSD * 4.18 * 100) / 100,
      platform: 'Weidian',
      rating: 7,
      cat: currentSection,
      img: '',
      description: name,
      brand: brandFromName(name),
      gender: 'women',
    });
  }

  return products;
}

function parseSheetProducts(csvText) {
  const rows = parseCSV(csvText);
  if (rows.length < 2) return [];

  let headerIdx = 0;
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const joined = rows[i].join(' ').toLowerCase();
    if (joined.includes('product') || joined.includes('item name') || joined.includes('name')) {
      headerIdx = i;
      break;
    }
  }

  const headers = rows[headerIdx].map(h => h.trim().toLowerCase().replace(/[^a-z]/g, ''));
  const products = [];

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 2) continue;

    const obj = {};
    headers.forEach((h, j) => { obj[h] = (row[j] || '').trim(); });

    const title = obj['itemname'] || obj['name'] || obj['product'] || obj['title'] || row[0] || '';
    const pricePLN = cleanPrice(obj['categoriespricpln'] || obj['pln'] || obj['pricepln'] || row[3] || row[1] || '');
    const priceUSD = cleanPrice(obj['directpricedusd'] || obj['usd'] || obj['priceusd'] || row[2] || '');

    let price = pricePLN;
    if (!price && priceUSD) price = Math.round(priceUSD * 4.18 * 100) / 100;
    if (!price) continue;

    const cleanTitle = title.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    if (!cleanTitle || cleanTitle.length < 2 || !Number.isFinite(price) || price > 10000) continue;

    products.push({
      title: cleanTitle,
      price,
      platform: 'Weidian',
      rating: 7,
      cat: catFromName(cleanTitle),
      img: '',
      description: cleanTitle,
      brand: brandFromName(cleanTitle),
      gender: undefined,
    });
  }

  return products;
}

const FALLBACK_PRODUCTS = [
  { id: 1, title: 'Air Jordan 4 Bred Reimagined', price: 289.99, platform: 'Weidian', rating: 9, cat: 'Buty', img: '', brand: 'Nike' },
  { id: 2, title: 'Air Jordan 1 Chicago OG', price: 219.0, platform: 'Weidian', rating: 9, cat: 'Buty', img: '', brand: 'Nike' },
  { id: 3, title: 'Nike Dunk Low Panda', price: 189.5, platform: 'Weidian', rating: 8, cat: 'Buty', img: '', brand: 'Nike' },
  { id: 4, title: 'Yeezy 350 V2 Beluga', price: 249.0, platform: 'Weidian', rating: 8, cat: 'Buty', img: '', brand: 'Adidas' },
  { id: 5, title: 'Yeezy 350 V2 Onyx', price: 239.0, platform: 'Weidian', rating: 8, cat: 'Buty', img: '', brand: 'Adidas' },
  { id: 6, title: 'New Balance 550 White Green', price: 199.0, platform: 'Weidian', rating: 8, cat: 'Buty', img: '', brand: 'New Balance' },
  { id: 7, title: 'Trapstar Decoded Hoodie', price: 159.9, platform: 'Weidian', rating: 9, cat: 'Bluzy', img: '', brand: 'Trapstar' },
  { id: 8, title: 'Essentials Fear of God Hoodie', price: 139.0, platform: 'Weidian', rating: 8, cat: 'Bluzy', img: '', brand: 'Essentials' },
  { id: 9, title: 'Stussy Basic Hoodie', price: 129.0, platform: 'Weidian', rating: 8, cat: 'Bluzy', img: '', brand: 'Stussy' },
  { id: 10, title: 'Nike Tech Fleece Hoodie', price: 149.0, platform: 'Weidian', rating: 9, cat: 'Bluzy', img: '', brand: 'Nike' },
];

function isUsableProduct(product) {
  const title = String(product?.title || '').trim();
  const price = Number(product?.price);
  return title.length >= 2 && Number.isFinite(price) && price > 0 && price <= 10000;
}



let productsCache = (() => {
  try {
    const disk = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'products.json'), 'utf8'));
    const usable = Array.isArray(disk) ? disk.filter(isUsableProduct) : [];
    return usable.length ? usable : [...FALLBACK_PRODUCTS];
  } catch {
    return [...FALLBACK_PRODUCTS];
  }
})();
let lastFetch = 0;
let refreshing = false;
let enrichRunning = false;
const CACHE_TTL = 15 * 60 * 1000;

function capMap(map, max) {
  if (map.size > max) {
    const it = map.keys();
    for (let i = 0; i < map.size - max; i++) map.delete(it.next().value);
  }
}

async function fetchSheet(url) {
  const isSheets = url.includes('sheets.googleapis.com');
  const attempts = isSheets ? GOOGLE_API_KEYS.length : 1;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const u = isSheets
      ? url.replace(/key=[^&]+/, `key=${GOOGLE_API_KEYS[(gKeyIdx + attempt) % GOOGLE_API_KEYS.length]}`)
      : url;

    const res = await fetch(u, { signal: AbortSignal.timeout(25000) });

    if (isSheets && (res.status === 429 || res.status === 403) && attempt + 1 < attempts) {
      gKeyIdx = (gKeyIdx + 1) % GOOGLE_API_KEYS.length;
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (isSheets && attempt > 0) gKeyIdx = (gKeyIdx + attempt) % GOOGLE_API_KEYS.length;
    return res.text();
  }
  throw new Error('Sheets API rate-limited');
}

function stableId(title) {
  let h = 5381;
  const s = title.toLowerCase().replace(/\s+/g, ' ').trim();
  for (let i = 0; i < s.length; i++) { h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; }
  return h;
}

function dedupe(products) {
  const map = new Map();
  for (const p of products) {
    const key = p.rawUrl
      ? p.rawUrl.toLowerCase()
      : (p.buyUrl
        ? p.buyUrl.toLowerCase()
        : `${p.title.toLowerCase().replace(/[^a-z0-9]/g, '')}_${p.img || ''}_${p.price}`);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, p);
    } else {
      if (!existing.img && p.img) map.set(key, p);
      else if (!existing.buyUrl && p.buyUrl) map.set(key, p);
    }
  }
  return [...map.values()];
}

function ossbuyItemUrl(rawUrl, title = '') {
  const raw = String(rawUrl || '').trim();
  if (/^https?:\/\//i.test(raw)) {
    const source = unwrapAgentUrl(raw);
    if (/weidian\.com|taobao\.com|1688\.com|tmall\.com/i.test(source)) {
      return `https://www.ossbuy.com/item?url=${encodeURIComponent(source)}`;
    }
  }
  return title
    ? `https://www.ossbuy.com/search?keyword=${encodeURIComponent(String(title))}`
    : '';
}

function isAgentProductUrl(rawUrl) {
  try {
    const host = new URL(rawUrl).hostname;
    return /(^|\.)(?:kakobuy|cnshopper|usfans|litbuy|oosbuy|ossbuy|gtbuy|hoobuy|pandabuy|acbuy|oopbuy|orientdig|cnfans|superbuy|sugargoo|basetao|lovegobuy|mulebuy|ezbuy|hubbuy|joybuy|manbuy|topbuy|westbuy|rownsneak|supplyment|dhgate|westock)\./i.test(host);
  } catch {
    return false;
  }
}

function preferredOutfitBuyUrl(sourceUrl, explicitBuyUrl, title = '') {
  const source = safeHttpUrl(sourceUrl);
  const explicit = safeHttpUrl(explicitBuyUrl);
  if (isAgentProductUrl(source)) return source;
  if (isAgentProductUrl(explicit)) return explicit;
  return ossbuyItemUrl(source, title) || explicit || source;
}

function normalizeOutfitPins(pins) {
  if (!Array.isArray(pins)) return [];
  const clamp = value => Math.max(0, Math.min(100, Number.isFinite(Number(value)) ? Number(value) : 50));
  return pins.slice(0, 30).map((pin, index) => {
    const url = safeHttpUrl(pin?.url);
    const title = String(pin?.title || '').trim().slice(0, 160);
    const priceNumber = Number(pin?.price);
    const buyUrl = preferredOutfitBuyUrl(url, pin?.buyUrl, title);
    return {
      id: String(pin?.id || `pin-${index + 1}`).slice(0, 64),
      x: clamp(pin?.x),
      y: clamp(pin?.y),
      title,
      url,
      buyUrl,
      price: Number.isFinite(priceNumber) && priceNumber >= 0 ? Math.round(priceNumber * 100) / 100 : null,
      currency: String(pin?.currency || 'PLN').slice(0, 8),
      source: String(pin?.source || '').slice(0, 24),
    };
  }).filter(pin => pin.title || pin.url);
}

function normalizeOutfitFields(body, defaultCategory, defaultRating) {
  const title = String(body?.title || '').trim().slice(0, 120);
  const desc = String(body?.desc || '').trim().slice(0, 800);
  const img = safeHttpUrl(body?.img);
  const cat = String(body?.cat || defaultCategory).trim().slice(0, 40) || defaultCategory;
  const inputRating = Number(body?.rating);
  const rating = Math.max(1, Math.min(10, Number.isFinite(inputRating) ? Math.round(inputRating) : defaultRating));
  return { title, desc, img, cat, rating };
}

function sanitizeOutfit(outfit) {
  const fields = normalizeOutfitFields(outfit || {}, 'Inne', 8);
  const likes = Number.isFinite(Number(outfit?.likes)) ? Math.max(0, Math.min(1000000000, Math.floor(Number(outfit.likes)))) : 0;
  return { ...outfit, ...fields, likes, pins: normalizeOutfitPins(outfit?.pins) };
}

function detectProductGender(product) {
  const explicit = String(product.gender || '').toLowerCase();
  if (explicit === 'unisex') return 'unisex';
  if (/women|woman|female|lad(y|ies)|girl|damsk|kobie/.test(explicit)) return 'women';
  if (/\bmen\b|\bmens\b|\bman\b|male|boy|gentleman|męsk|mesk/.test(explicit)) return 'men';

  const text = `${product.title || ''} ${product.description || ''} ${product.cat || ''}`.toLowerCase();
  if (/women|woman|female|lad(y|ies)|girl|damsk|kobie|sukien|dress|skirt|bikini|bra|heels|crop.?top|yoga.?pant/.test(text)) return 'women';
  if (/\bmen\b|\bmens\b|\bman\b|male|boy|gentleman|męsk|mesk|chłop/.test(text)) return 'men';



  if (/jordan|yeezy|dunk|trapstar|corteiz|supreme|stussy|essentials|fear.?of.?god|carhartt|north.?face|tech.?fleece|football.?jersey|basketball/.test(text)) return 'men';
  if (/lululemon|alo\b|zara\b/.test(text) && !/men|mens|male|męsk|mesk/.test(text)) return 'women';
  return 'unisex';
}

function getProducts() {
  if (Date.now() - lastFetch > CACHE_TTL) refreshProducts();


  return (Array.isArray(productsCache) ? productsCache : []).filter(Boolean).map(p => ({
    ...p,
    title: String(p.title || 'Bez nazwy'),
    cat: String(p.cat || 'Inne'),
    brand: p.brand == null ? '' : String(p.brand),
    price: Number.isFinite(Number(p.price)) ? Number(p.price) : 0,
    gender: detectProductGender(p),
    buyUrl: ossbuyItemUrl(p.rawUrl, p.title) || p.buyUrl || '',
  }));
}

async function refreshProducts() {
  if (refreshing) return;
  refreshing = true;
  let merged = [];

  if (GOOGLE_API_KEY) {
    const results = await Promise.allSettled(
      getConfiguredSheetSources().map(src =>
        fetchSheet(apiGridUrl(src.id, src.range)).then(txt => ({ src, json: JSON.parse(txt) }))
      )
    );
    for (const r of results) {
      if (r.status !== 'fulfilled') { console.error('Sheet fetch error:', r.reason?.message); continue; }
      try {
        merged.push(...parseApiSheet(r.value.json, r.value.src));
      } catch (e) {
        console.error('Sheet parse error:', e.message);
      }
    }
    console.log(`Loaded ${merged.length} products from ${getConfiguredSheetSources().length} sheets (API mode)`);
  }

  if (merged.length === 0) {
    const configuredSources = getConfiguredSheetSources();
    const csvSources = configuredSources.length
      ? configuredSources
      : [
          { csvUrl: SHEET_CSV_URL, gender: 'men', category: 'auto' },
          { csvUrl: SHEET2_CSV_URL, gender: 'women', category: 'auto' },
        ];
    const results = await Promise.allSettled(csvSources.map(src => fetchSheet(src.csvUrl)));
    const parsedBySource = results.map((result, index) => {
      if (result.status !== 'fulfilled') return [];
      const text = result.value;
      let parsed = [];
      try {


        const generic = parseSheetProducts(text);
        const legacy = parseSheet2(text);
        parsed = generic.length >= legacy.length ? generic : legacy;
      } catch {}
      const sourceGender = csvSources[index].gender || 'auto';
      const sourceCategory = csvSources[index].category || 'auto';
      return parsed.map(p => ({
        ...p,
        ...(sourceGender !== 'auto' && { gender: sourceGender }),
        ...(sourceCategory !== 'auto' && { cat: sourceCategory }),
      }));
    });
    merged = parsedBySource.flat();
    console.log(`Loaded ${merged.length} products (CSV fallback from ${csvSources.length} tabs)`);
  }

  merged = dedupe(merged).filter(isUsableProduct).map(p => ({
    ...p,
    id: stableId(`${p.title}_${p.rawUrl || p.buyUrl || ''}_${p.price}`),
  }));

  const prevAdded = new Map();
  try {
    const disk = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'products.json'), 'utf8'));
    if (Array.isArray(disk)) disk.filter(isUsableProduct).forEach(p => { if (p.added != null) prevAdded.set(p.id, p.added); });
  } catch {}

  let counter = 0;
  prevAdded.forEach(v => { if (Number(v) > counter) counter = Number(v); });

  merged = merged.map(p => ({
    ...p,
    added: prevAdded.has(p.id) ? prevAdded.get(p.id) : ++counter,
  }));
  merged.sort((a, b) => (b.added || 0) - (a.added || 0));

  const missing = merged.filter(p => !p.img && p.rawUrl);
  if (missing.length > 0 && !enrichRunning) {
    enrichRunning = true;
    (async () => {
      try {

        function extractWeidianId(rawUrl) {
          if (!rawUrl) return null;

          const direct = rawUrl.match(/itemID=(\d+)/);
          if (direct) return direct[1];

          try {
            const u = new URL(rawUrl);
            const inner = u.searchParams.get('url') || u.searchParams.get('platformUrl') || u.searchParams.get('goodsUrl');
            if (inner) {
              const m = decodeURIComponent(inner).match(/itemID=(\d+)/);
              if (m) return m[1];
            }
          } catch {}
          return null;
        }

        const items = missing
          .map(p => ({ p, itemId: extractWeidianId(p.rawUrl) }))
          .filter(e => e.itemId);

        console.log(`Image enrich: ${items.length} products with Weidian IDs to fetch`);

        let di = 0;
        const worker = async () => {
          while (di < items.length) {
            const { p, itemId } = items[di++];
            if (p.img) continue;
            if (imgCacheMap[p.rawUrl]) { p.img = imgCacheMap[p.rawUrl]; continue; }
            const img = await weidianImage(itemId);
            if (img) { p.img = img; imgCacheMap[p.rawUrl] = img; }
          }
        };

        await Promise.all(Array.from({ length: 5 }, worker));
        saveImgCache();
        console.log(`Image enrich done: ${merged.filter(m => m.img).length}/${merged.length} have images`);
      } catch (e) {
        console.error('Image enrich error:', e.message);
      }
      try { fs.writeFileSync(path.join(__dirname, 'data', 'products.json'), JSON.stringify(merged)); } catch {}
      enrichRunning = false;
    })();
  }

  if (merged.length > 0) {
    let prevLen = 0;
    try { prevLen = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'products.json'), 'utf8')).length; } catch {}
    const shouldSave = merged.length >= prevLen * 0.5 || prevLen === 0;
    lastFetch = Date.now();
    if (shouldSave) {
      productsCache = merged;
      try { fs.writeFileSync(path.join(__dirname, 'data', 'products.json'), JSON.stringify(merged)); } catch {}
      console.log(`Cache updated: ${merged.length} products`);
    } else {
      console.warn(`Ignored suspicious product refresh: ${merged.length} products received, keeping ${productsCache.length}`);
    }
  } else {
    if (productsCache.length === 0) {
      try {
        const fromDisk = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'products.json'), 'utf8'));
        if (Array.isArray(fromDisk) && fromDisk.length) {
          productsCache = fromDisk;
          console.log(`Loaded ${fromDisk.length} products from disk`);
        }
      } catch {}
    }
    if (productsCache.length === 0) productsCache = [...FALLBACK_PRODUCTS];
  }

  refreshing = false;
}

refreshProducts();

app.get('/api/products', (req, res) => {
  const { q, cat, page = 1, limit = 24, random, latest, min, max, brand, sort, gender } = req.query;


  res.setHeader('Cache-Control', random
    ? 'no-store'
    : 'public, max-age=15, stale-while-revalidate=60');
  let result = [...getProducts()];

  if (q) {
    const ql = q.toLowerCase();
    result = result.filter(p =>
      String(p.title).toLowerCase().includes(ql) ||
      String(p.cat).toLowerCase().includes(ql) ||
      String(p.brand || '').toLowerCase().includes(ql)
    );
  }
  if (cat && cat !== 'Wszystkie') result = result.filter(p => p.cat === cat);
  if (gender === 'women' || gender === 'men' || gender === 'unisex') {


    result = result.filter(p => p.gender === gender);
  }
  if (brand) result = result.filter(p => (p.brand || '').toLowerCase() === String(brand).toLowerCase());
  if (min !== undefined && min !== '' && !isNaN(Number(min))) result = result.filter(p => p.price >= Number(min));
  if (max !== undefined && max !== '' && !isNaN(Number(max))) result = result.filter(p => p.price <= Number(max));




  if ((!cat || cat === 'cat.all' || cat === 'Wszystkie') && !random && !latest && !sort) {
    const categoryOrder = new Map([
      ['buty', 0],
      ['spodenki', 1],
      ['spodnie', 2],
      ['koszulki', 3],
      ['longsleeve', 4],
      ['bluzy', 5],
      ['kurtki', 6],
      ['nakrycie glowy', 7],
      ['torby i plecaki', 8],
      ['pasy', 9],
      ['akcesoria', 10],
      ['elektronika', 11],
      ['inne', 12],
    ]);
    const normalizeCategory = value => String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    result = result
      .map((item, index) => ({ item, index, rank: categoryOrder.get(normalizeCategory(item.cat)) ?? 99 }))
      .sort((a, b) => a.rank - b.rank || a.index - b.index)
      .map(({ item }) => item);
  }

  if (random) {
    const count = Math.min(parseInt(random) || 8, result.length);
    const linked = result.filter(p => p.buyUrl);
    const pool = linked.length >= count ? linked : [...linked, ...result.filter(p => !p.buyUrl)];
    return res.json({ items: pool.sort(() => 0.5 - Math.random()).slice(0, count), total: getProducts().length });
  }

  if (latest) {
    const count = Math.min(parseInt(latest) || 12, result.length || 60);
    const withImg = result.filter(p => p.img);
    const pool = withImg.length >= count ? withImg : [...withImg, ...result.filter(p => !p.img)];
    return res.json({ items: pool.slice(0, count), total: getProducts().length });
  }

  if (sort === 'price_asc') result.sort((a, b) => a.price - b.price);
  else if (sort === 'price_desc') result.sort((a, b) => b.price - a.price);

  const start = (parseInt(page) - 1) * parseInt(limit);
  res.json({ items: result.slice(start, start + parseInt(limit)), total: result.length });
});

app.get('/api/brands', (_req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=900');
  const brands = [...new Set(getProducts().map(p => String(p.brand || '')).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  res.json({ brands });
});

function titleTokens(t) {
  return String(t || '').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 3);
}

app.get('/api/products/similar/:id', (req, res) => {
  const p = getProducts().find(x => String(x.id) === String(req.params.id));
  if (!p) return res.json({ items: [] });

  const tokens = new Set(titleTokens(p.title));
  const scored = getProducts()
    .filter(x => String(x.id) !== String(p.id))
    .map(x => {
      let s = 0;
      if (x.cat === p.cat) s += 2;
      if (p.brand && x.brand === p.brand) s += 5;
      for (const w of titleTokens(x.title)) if (tokens.has(w)) s += 3;
      if (x.buyUrl) s += 0.5;
      return { x, s };
    })
    .sort((a, b) => b.s - a.s);

  res.json({ items: scored.slice(0, 12).map(o => o.x) });
});

app.get('/api/products/:id', (req, res) => {
  const p = getProducts().find(x => String(x.id) === String(req.params.id));
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json(p);
});

const outfitLookupCache = new Map();
const OUTFIT_LOOKUP_TTL = 15 * 60 * 1000;

function lookupItemId(url) {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get('itemID') || parsed.searchParams.get('id') || null;
  } catch {
    return (String(url).match(/[?&](?:itemID|id)=([^&#]+)/i) || [])[1] || null;
  }
}

function safeHttpUrl(value) {
  const raw = String(value || '').trim();
  if (!raw || raw.length > 2000) return '';
  try {
    const url = new URL(raw);
    if (!/^https?:$/.test(url.protocol) || url.username || url.password) return '';
    if (/^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[::1\])/i.test(url.hostname)) return '';
    return url.toString().slice(0, 2000);
  } catch {
    return '';
  }
}

app.post('/api/outfit-item/lookup', async (req, res) => {
  let input = String(req.body?.url || '').trim();
  const requestedTitle = String(req.body?.title || '').trim();
  if (!input) return res.status(400).json({ success: false, error: 'url required' });
  if (!/^https?:\/\//i.test(input)) {
    try { input = decodeURIComponent(input); } catch {}
  }
  const inputUrl = safeHttpUrl(input);
  const clean = unwrapAgentUrl(inputUrl || input);
  if (!/^https?:\/\//i.test(clean)) return res.status(400).json({ success: false, error: 'Invalid URL' });

  const key = clean.toLowerCase();
  const cached = outfitLookupCache.get(key);
  if (cached && Date.now() - cached.ts < OUTFIT_LOOKUP_TTL) return res.json(cached.value);

  const sourceId = lookupItemId(clean);
  const products = getProducts();
  let product = products.find(p => String(p.rawUrl || '').toLowerCase() === key || String(p.buyUrl || '').toLowerCase() === String(input).toLowerCase());
  if (!product && sourceId) {
    product = products.find(p => lookupItemId(p.rawUrl || '') === sourceId);
  }
  if (!product && requestedTitle) {
    const titleKey = requestedTitle.toLowerCase();
    const titleMatches = products.filter(p => String(p.title || '').toLowerCase() === titleKey);
    if (titleMatches.length === 1) product = titleMatches[0];
  }

  if (product) {
    const value = {
      success: true,
      source: 'catalog',
      title: product.title,
      price: Number.isFinite(Number(product.price)) ? Number(product.price) : null,
      currency: 'PLN',
      productId: product.id,
      url: isAgentProductUrl(inputUrl) ? inputUrl : (product.rawUrl || clean),
      buyUrl: preferredOutfitBuyUrl(inputUrl || product.rawUrl || clean, product.buyUrl, product.title),
    };
    outfitLookupCache.set(key, { ts: Date.now(), value });
    if (outfitLookupCache.size > 1000) outfitLookupCache.delete(outfitLookupCache.keys().next().value);
    return res.json(value);
  }

  try {
    const qcRes = await fetch(`https://qcitems.com/api/product?url=${encodeURIComponent(clean)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://qcitems.com/' },
      signal: AbortSignal.timeout(8000),
    });
    const qc = await qcRes.json();
    const info = qc?.info || {};
    const price = Number(info.price);
    if (qcRes.ok && qc.success && Number.isFinite(price) && price > 0) {
      const value = {
        success: true,
        source: 'qcitems',
        title: info.titleEn || info.title || requestedTitle || 'Produkt',
        price,
        currency: info.currency || 'CNY',
        productId: qc.productId || null,
        url: isAgentProductUrl(inputUrl) ? inputUrl : clean,
        buyUrl: preferredOutfitBuyUrl(inputUrl || clean, '', info.titleEn || info.title || requestedTitle),
      };
      outfitLookupCache.set(key, { ts: Date.now(), value });
      return res.json(value);
    }
  } catch {}

  return res.status(404).json({ success: false, error: 'Nie znaleziono ceny dla tego linku' });
});

app.get('/api/sheet-status', authMiddleware, (_req, res) => {
  res.json({ productCount: getProducts().length, lastFetch: new Date(lastFetch).toISOString() });
});

const AGENTS = [
  { name: 'OSSbuy', tag: 'polecany', shipping: 'od 48 zł/kg', discount: 50, coupon: 'Kyzreps', fee: '0%', affLink: 'https://www.ossbuy.com/register?inviteCode=Kyzreps' },
  { name: 'KakoBuy', tag: '', shipping: 'od 50 zł/kg', coupon: 'kyzreps', fee: '0%', affLink: 'https://www.kakobuy.com/register/?affcode=kyzreps', affCode: 'kyzreps' },
];

function getAgents() {
  const overrides = readJSON('agent-overrides', {});
  return AGENTS
    .map(a => ({ ...a, ...(overrides[a.name] || {}) }))
    .sort((a, b) => (a.name === 'OSSbuy' ? -1 : b.name === 'OSSbuy' ? 1 : 0))
    .map(a => ({
      ...a,
      affLink: safeHttpUrl(a.affLink),
      tag: a.name === 'OSSbuy' ? 'polecany' : '',
    }));
}

app.get('/api/agents', (_req, res) => res.json(getAgents()));

app.get('/api/buy-links', (req, res) => {
  const { url, title } = req.query;
  const encoded = url ? encodeURIComponent(url) : null;
  const searchKw = title ? encodeURIComponent(title) : null;

  const links = getAgents().map(a => {
    let buyUrl = '';
    if (encoded) {
      if (a.name === 'KakoBuy') buyUrl = `https://www.kakobuy.com/item/details?url=${encoded}&affcode=${a.affCode}`;
      else if (a.name === 'OSSbuy') buyUrl = `https://www.ossbuy.com/item?url=${encoded}`;
    } else if (searchKw) {
      if (a.name === 'KakoBuy') buyUrl = `https://www.kakobuy.com/search?keyword=${searchKw}&affcode=${a.affCode}`;
      else if (a.name === 'OSSbuy') buyUrl = `https://www.ossbuy.com/search?keyword=${searchKw}`;
    }
    return { name: a.name, tag: a.tag, buyUrl, affLink: a.affLink, fee: a.fee, shipping: a.shipping, coupon: a.coupon };
  });

  res.json(links);
});

const OUR_AFFILIATES = {
  kakobuy:   { code: 'kyzreps', params: ['affcode'] },
  oosbuy:    { code: 'Kyzreps', params: ['inviteCode'] },
  ossbuy:    { code: 'Kyzreps', params: ['inviteCode'] },
};

function rewriteAffiliate(name, link) {
  const conf = OUR_AFFILIATES[(name || '').toLowerCase().replace(/[^a-z]/g, '')];
  if (!conf) return link;
  try {
    const u = new URL(link);
    const key = conf.params.find(p => u.searchParams.has(p)) || conf.params[0];
    u.searchParams.set(key, conf.code);
    return u.toString();
  } catch {
    return link;
  }
}

const OUR_AGENT_KEYS = new Set(['kakobuy', 'oosbuy', 'ossbuy']);
const normAgent = (n) => String(n || '').toLowerCase().replace(/[^a-z]/g, '');

function extractGoodsId(jumpUrl) {
  try {
    const u = new URL(jumpUrl);
    const m = u.pathname.match(/goodItemDetail\/(?:qc|uu)\/([^/?#]+)/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

async function fetchUuAgents(goodsId) {
  if (!goodsId || !/^[0-9a-f]+$/i.test(goodsId)) return [];
  try {
    const r = await fetch(`https://api.uufinds.com/goods/${goodsId}/agent?sortType=qcPage`, {
      headers: { 'X-Client-Type': 'web' },
      signal: AbortSignal.timeout(12000),
    });
    const json = await r.json();
    if (!json.success || !Array.isArray(json.result)) return [];
    return json.result
      .filter(a => a.link && OUR_AGENT_KEYS.has(normAgent(a.name)))
      .map(a => ({ name: a.name, logo: a.squareLogo || a.logo || '', link: rewriteAffiliate(a.name, a.link) }));
  } catch {
    return [];
  }
}

function mergeAgentsWithUu(uuAgents) {
  const uuMap = new Map();
  uuAgents.forEach(a => {
    const k = normAgent(a.name);
    uuMap.set(k, a);
    if (k === 'oosbuy') uuMap.set('ossbuy', a);
    if (k === 'ossbuy') uuMap.set('oosbuy', a);
  });
  return getAgents()
    .map(a => {
      const fromUu = uuMap.get(normAgent(a.name));
      return fromUu ? { name: a.name, logo: fromUu.logo || '', link: fromUu.link } : null;
    })
    .filter(Boolean);
}

const uuCache = new Map();
const UU_TTL = 30 * 60 * 1000;

app.get('/api/convert', async (req, res) => {
  const { url: rawUrl } = req.query;
  if (!rawUrl) return res.status(400).json({ success: false, error: 'url param required' });

  const url = unwrapAgentUrl(decodeURIComponent(rawUrl));
  const convertible = /detail\.1688\.com|hoobuy\.com/i.test(url)
    ? url
    : `https://www.kakobuy.com/item/details?url=${encodeURIComponent(url)}`;

  try {
    const convRes = await fetch(
      `https://api.uufinds.com/open/api/convertUrl?from=kyzreps&url=${encodeURIComponent(convertible)}`,
      { signal: AbortSignal.timeout(12000) }
    );
    const conv = await convRes.json();
    if (!conv.success || !conv.result?.url) {
      return res.json({ success: false, message: conv.message || 'No result' });
    }

    const uuAgents = await fetchUuAgents(extractGoodsId(conv.result.url));
    const agents = mergeAgentsWithUu(uuAgents);

    res.json({ success: true, qcQuantity: conv.result.qcQuantity || 0, jumpUrl: conv.result.url, agents });
  } catch (err) {
    console.error('UUFinds error:', err.message);
    res.status(502).json({ success: false, error: 'UUFinds API unreachable' });
  }
});

app.get('/api/uu-agents', async (req, res) => {
  const { url: rawUrl } = req.query;
  if (!rawUrl) return res.status(400).json({ error: 'url param required' });

  const clean = unwrapAgentUrl(decodeURIComponent(rawUrl));
  const convertible = /detail\.1688\.com|hoobuy\.com/i.test(clean)
    ? clean
    : `https://www.kakobuy.com/item/details?url=${encodeURIComponent(clean)}`;

  const cached = uuCache.get(clean);
  if (cached && Date.now() - cached.ts < UU_TTL) {
    return res.json({ success: true, qcQuantity: cached.qc, jumpUrl: cached.jumpUrl, agents: cached.agents });
  }

  try {
    const convRes = await fetch(
      `https://api.uufinds.com/open/api/convertUrl?from=kyzreps&url=${encodeURIComponent(convertible)}`,
      { signal: AbortSignal.timeout(12000) }
    );
    const conv = await convRes.json();
    if (!conv.success || !conv.result?.url) {
      return res.json({ success: false, message: conv.message || 'No result' });
    }

    const uuAgents = await fetchUuAgents(extractGoodsId(conv.result.url));
    const agents = mergeAgentsWithUu(uuAgents);

    uuCache.set(clean, { agents, qc: conv.result.qcQuantity || 0, jumpUrl: conv.result.url, ts: Date.now() });
    capMap(uuCache, 2000);

    res.json({ success: true, qcQuantity: conv.result.qcQuantity || 0, jumpUrl: conv.result.url, agents });
  } catch (err) {
    console.error('UUFinds error:', err.message);
    res.status(502).json({ error: 'UUFinds API unreachable' });
  }
});

app.post('/api/resolve', async (req, res) => {
  const { url: rawUrl } = req.body || {};
  if (!rawUrl) return res.status(400).json({ success: false, error: 'url required' });

  const url = unwrapAgentUrl(decodeURIComponent(rawUrl));

  let agents = [], qcQuantity = 0, jumpUrl = '';

  try {
    const convertible = /detail\.1688\.com|hoobuy\.com/i.test(url)
      ? url
      : `https://www.kakobuy.com/item/details?url=${encodeURIComponent(url)}`;

    const convRes = await fetch(
      `https://api.uufinds.com/open/api/convertUrl?from=kyzreps&url=${encodeURIComponent(convertible)}`,
      { signal: AbortSignal.timeout(12000) }
    );
    const conv = await convRes.json();

    if (conv.success && conv.result?.url) {
      jumpUrl = conv.result.url;
      qcQuantity = conv.result.qcQuantity || 0;
      const uuAgents = await fetchUuAgents(extractGoodsId(conv.result.url));
      agents = mergeAgentsWithUu(uuAgents);
    }
  } catch {}

  res.json({ success: true, originalUrl: url, weidianUrl: url, weifindsUsed: false, qcQuantity, jumpUrl, agents });
});


app.get('/api/product-gallery', async (req, res) => {
  const { url: rawUrl } = req.query;
  if (!rawUrl) return res.status(400).json({ success: false, error: 'url param required' });

  const url = unwrapAgentUrl(decodeURIComponent(rawUrl));
  const convertible = /detail\.1688\.com|hoobuy\.com/i.test(url)
    ? url
    : `https://www.kakobuy.com/item/details?url=${encodeURIComponent(url)}`;

  try {
    const convRes = await fetch(
      `https://api.uufinds.com/open/api/convertUrl?from=kyzreps&url=${encodeURIComponent(convertible)}`,
      { signal: AbortSignal.timeout(12000) }
    );
    const conv = await convRes.json();
    if (!conv.success || !conv.result?.url) {
      return res.json({ success: false, photos: [], variants: [] });
    }

    const goodsId = extractGoodsId(conv.result.url);
    if (!goodsId) return res.json({ success: false, photos: [], variants: [] });


    const detailRes = await fetch(
      `https://api.uufinds.com/goods/detail/${goodsId}`,
      { headers: { 'X-Client-Type': 'web', 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10000) }
    );
    const detail = await detailRes.json();
    const item = detail.result || detail.data || {};


    const photos = (item.images || item.imgs || item.mainImgs || [])
      .map(i => typeof i === 'string' ? i : (i.url || i.img || ''))
      .filter(Boolean)
      .slice(0, 20);


    const variants = [];
    const skuProps = item.skuProps || item.props || item.skuBase?.props || [];
    for (const prop of skuProps) {
      const vals = (prop.values || prop.vals || []).map(v => ({
        id: v.vid || v.id || v.name,
        name: v.name || v.vid,
        img: v.image || v.img || '',
      }));
      if (vals.length > 0) {
        variants.push({ name: prop.name || prop.prop, values: vals });
      }
    }

    res.json({ success: true, jumpUrl: conv.result.url, goodsId, photos, variants, qcQuantity: conv.result.qcQuantity || 0 });
  } catch (err) {
    res.json({ success: false, photos: [], variants: [], error: err.message });
  }
});

app.get('/api/qc-photos', async (req, res) => {
  const { url: rawUrl } = req.query;
  if (!rawUrl) return res.status(400).json({ success: false, error: 'url param required' });

  const url = unwrapAgentUrl(decodeURIComponent(rawUrl));

  async function tryQc(targetUrl) {
    const attempts = [
      { Referer: 'https://vectoreps.pl/', Origin: 'https://vectoreps.pl' },
      { Referer: 'https://qcitems.com/', Origin: 'https://qcitems.com' },
      {},
    ];
    for (const extraHeaders of attempts) {
      try {
        const r = await fetch(`https://qcitems.com/api/product?url=${encodeURIComponent(targetUrl)}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125.0.0.0',
            ...extraHeaders,
          },
          signal: AbortSignal.timeout(15000),
        });
        const data = await r.json();
        if (!data.success) return { ok: false, data };

        const allPhotos = [];
        for (const [agent, items] of Object.entries(data.qcGroups || {})) {
          if (!Array.isArray(items)) continue;
          for (const item of items) {
            for (const p of (item.photos || item._doc?.photos || [])) {
              const photoUrl = p.url || p.originalUrl || p;
              if (typeof photoUrl === 'string' && photoUrl.startsWith('http')) {
                allPhotos.push({ url: photoUrl, agent, name: item.name || '' });
              }
            }
          }
        }
        return { ok: true, data, allPhotos };
      } catch { continue; }
    }
    return { ok: false, data: null };
  }

  const first = await tryQc(url);

  if ((!first.ok || first.allPhotos?.length === 0) && /1688|taobao|tmall|hoobuy|kakobuy|item\.html/i.test(url) && !/weidian\.com/i.test(url)) {

  }

  if (first.ok) {
    return res.json({
      success: true,
      photos: first.allPhotos || [],
      totalPhotos: first.data.totalPhotos || first.allPhotos?.length || 0,
      productId: first.data.productId,
      info: first.data.info ? {
        title: first.data.info.titleEn || first.data.info.title,
        image: first.data.info.image,
        price: first.data.info.price,
      } : null,
    });
  }

  res.status(502).json({ success: false, error: 'No QC data found' });
});

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET || '';
if (!TURNSTILE_SECRET) console.warn('TURNSTILE_SECRET not set');

app.post('/api/turnstile/verify', async (req, res) => {
  const { token } = req.body || {};
  if (!token || typeof token !== 'string' || token.length === 0 || token.length > 2048) {
    return res.status(403).json({ success: false, error: 'Token required' });
  }
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(10000),
      body: new URLSearchParams({ secret: TURNSTILE_SECRET, response: token }),
    });
    if (!r.ok) throw new Error(`siteverify ${r.status}`);
    const result = await r.json();
    if (result.success) return res.json({ success: true });
    return res.status(403).json({ success: false, error: 'Verification failed' });
  } catch (err) {
    console.error('Turnstile error:', err.message);
    return res.status(502).json({ success: false, error: 'Cloudflare unreachable' });
  }
});

const DEFAULT_NEWS = [
  { id: 'n1', title: '−30% na wysyłkę w OSSbuy!', date: '2025-06-10', desc: 'OSSbuy uruchomił promocję −30% na pierwszą wysyłkę dla nowych użytkowników. Zarejestruj się przez nasz link i odbierz bonusy o wartości do 3500 yuanów.', tag: 'Promocja', agent: 'OSSbuy', agentLink: 'https://www.ossbuy.com/register?inviteCode=Kyzreps' },
];

const PRIMARY_NEWS = [{
  ...DEFAULT_NEWS[0],
  agent: 'OSSbuy',
  agentLink: 'https://www.ossbuy.com/register?inviteCode=Kyzreps',
}];

const DEFAULT_OUTFITS = [];

app.get('/api/news', (_req, res) => {
  const stored = readJSON('news', PRIMARY_NEWS);
  const news = Array.isArray(stored) && stored.length ? stored : PRIMARY_NEWS;
  const partner = news.find(item => /ossbuy/i.test(String(item?.agent || '')) || /ossbuy/i.test(String(item?.agentLink || ''))) || PRIMARY_NEWS[0];
  res.json([{
    ...partner,
    title: String(partner?.title || '').slice(0, 140),
    desc: String(partner?.desc || '').slice(0, 1200),
    agent: 'OSSbuy',
    agentLink: safeHttpUrl(partner?.agentLink) || PRIMARY_NEWS[0].agentLink,
  }]);
});
app.get('/api/outfits', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const stored = readJSON('outfits', DEFAULT_OUTFITS);
  const outfits = Array.isArray(stored) && stored.length ? stored : DEFAULT_OUTFITS;
  res.json(outfits.map(sanitizeOutfit));
});

app.post('/api/outfits/:id/like', outfitLikeLimiter, (req, res) => {
  const id = String(req.params.id || '').trim().slice(0, 120);
  if (!id) return res.status(400).json({ error: 'Outfit id required' });
  const stored = readJSON('outfits', DEFAULT_OUTFITS);
  if (!Array.isArray(stored)) return res.status(404).json({ error: 'Outfit not found' });
  const index = stored.findIndex(outfit => String(outfit?.id) === id);
  if (index < 0) return res.status(404).json({ error: 'Outfit not found' });
  const liked = req.body?.liked !== false;
  const current = Number.isFinite(Number(stored[index].likes)) ? Math.max(0, Math.floor(Number(stored[index].likes))) : 0;
  stored[index] = { ...stored[index], likes: Math.max(0, Math.min(1000000000, current + (liked ? 1 : -1))) };
  writeJSON('outfits', stored.slice(0, 2000));
  res.json({ likes: stored[index].likes, liked });
});

app.post('/api/admin/news', authMiddleware, (req, res) => {
  const title = String(req.body?.title || '').trim().slice(0, 140);
  const desc = String(req.body?.desc || '').trim().slice(0, 1200);
  const date = String(req.body?.date || '').trim().slice(0, 20);
  const tag = String(req.body?.tag || 'Update').trim().slice(0, 40) || 'Update';
  const agent = String(req.body?.agent || '').trim().slice(0, 60);
  const agentLink = safeHttpUrl(req.body?.agentLink);
  if (!title || !desc) return res.status(400).json({ error: 'Title and description required' });
  const news = readJSON('news', DEFAULT_NEWS);
  const item = {
    id: crypto.randomUUID(),
    title,
    desc,
    date: date || new Date().toISOString().slice(0, 10),
    tag,
    agent,
    agentLink,
  };
  news.unshift(item);
  writeJSON('news', news);
  res.json(news);
});

app.delete('/api/admin/news/:id', authMiddleware, (req, res) => {
  const news = readJSON('news', DEFAULT_NEWS).filter(n => n.id !== req.params.id);
  writeJSON('news', news);
  res.json(news);
});

app.post('/api/admin/outfits', authMiddleware, (req, res) => {
  const fields = normalizeOutfitFields(req.body || {}, 'Inne', 8);
  if (!fields.title) return res.status(400).json({ error: 'Title required' });
  const outfits = readJSON('outfits', DEFAULT_OUTFITS);
  const item = {
    id: crypto.randomUUID(),
    ...fields,
    likes: 0,
    pins: normalizeOutfitPins(req.body?.pins),
  };
  const nextOutfits = [item, ...outfits].slice(0, 2000);
  writeJSON('outfits', nextOutfits);
  res.json(nextOutfits);
});

app.delete('/api/admin/outfits/:id', authMiddleware, (req, res) => {
  const outfits = readJSON('outfits', DEFAULT_OUTFITS).filter(o => o.id !== req.params.id);
  writeJSON('outfits', outfits);
  res.json(outfits);
});

app.get('/api/favorites', (_req, res) => res.json(readJSON('favorites', [])));

app.post('/api/favorites', (req, res) => {
  const stored = readJSON('favorites', []);
  const favs = Array.isArray(stored) ? stored.map(value => String(value).slice(0, 120)).slice(-1000) : [];
  const id = String(req.body?.id || '').trim().slice(0, 120);
  if (!id) return res.status(400).json({ error: 'id required' });
  const idx = favs.indexOf(id);
  if (idx === -1) favs.push(id); else favs.splice(idx, 1);
  const nextFavorites = favs.slice(-1000);
  writeJSON('favorites', nextFavorites);
  res.json({ favorites: nextFavorites, added: idx === -1 });
});


const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '';
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || '';
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'http://localhost:3002/api/auth/discord/callback';
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID || '';
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || '';

const discordSessions = new Map();
const discordAuthStates = new Map();
const DISCORD_SESSION_TTL = 7 * 24 * 60 * 60 * 1000;  
const DISCORD_STATE_TTL = 10 * 60 * 1000;

if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
  console.warn('Discord OAuth not configured (DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET missing)');
}

function discordAuthMiddleware(req, res, next) {
  const token = req.cookies.discord_session || req.headers.authorization?.replace('Bearer ', '');
  const session = discordSessions.get(token);
  if (!session || Date.now() > session.expires) {
    if (session) discordSessions.delete(token);
    return res.status(401).json({ error: 'Not authenticated' });
  }
  req.discordUser = session.user;
  next();
}

async function addDiscordMember(userId, userAccessToken) {
  if (!DISCORD_GUILD_ID || !DISCORD_BOT_TOKEN) return false;
  try {
    const response = await fetch(`https://discord.com/api/v10/guilds/${encodeURIComponent(DISCORD_GUILD_ID)}/members/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ access_token: userAccessToken }),
    });

    if (response.status === 201 || response.status === 204) return true;
    console.error('Discord guild join failed:', response.status, (await response.text()).slice(0, 500));
  } catch (error) {
    console.error('Discord guild join request failed:', error.message);
  }
  return false;
}

app.get('/api/auth/discord', oauthLimiter, (_req, res) => {
  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) return res.status(500).json({ error: 'Discord OAuth not configured' });
  for (const [pendingState, expires] of discordAuthStates) {
    if (expires <= Date.now()) discordAuthStates.delete(pendingState);
  }
  const state = crypto.randomUUID();
  discordAuthStates.set(state, Date.now() + DISCORD_STATE_TTL);
  if (discordAuthStates.size > 1000) discordAuthStates.delete(discordAuthStates.keys().next().value);
  const scopes = DISCORD_GUILD_ID && DISCORD_BOT_TOKEN ? 'identify guilds.join' : 'identify';
  const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${encodeURIComponent(state)}`;
  res.cookie('discord_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: DISCORD_STATE_TTL,
    path: '/',
  });
  res.redirect(authUrl);
});

app.get('/api/auth/discord/callback', oauthLimiter, async (req, res) => {
  const { code, state } = req.query;
  if (!code) return res.status(400).send('Missing code');
  const expectedState = req.cookies.discord_oauth_state;
  const stateExpires = state ? discordAuthStates.get(state) : 0;
  discordAuthStates.delete(state);
  res.clearCookie('discord_oauth_state', { path: '/' });
  if (!state || !expectedState || state !== expectedState || !stateExpires || Date.now() > stateExpires) {
    return res.status(400).send('Invalid OAuth state');
  }

  try {

    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: DISCORD_REDIRECT_URI,
      }),
    });

    if (!tokenRes.ok) {
      console.error('Discord token exchange failed:', await tokenRes.text());
      return res.redirect('/?auth=failed');
    }

    const tokenData = await tokenRes.json();


    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userRes.ok) {
      console.error('Discord user fetch failed');
      return res.redirect('/?auth=failed');
    }

    const userData = await userRes.json();

    await addDiscordMember(userData.id, tokenData.access_token);


    const sessionToken = crypto.randomUUID();
    discordSessions.set(sessionToken, {
      user: {
        id: userData.id,
        username: userData.username,
        discriminator: userData.discriminator,
        avatar: userData.avatar,
      },
      expires: Date.now() + DISCORD_SESSION_TTL,
    });

    res.cookie('discord_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: DISCORD_SESSION_TTL,
      path: '/',
    });

    res.redirect('/outfity?auth=success');
  } catch (error) {
    console.error('Discord OAuth error:', error);
    res.redirect('/?auth=failed');
  }
});

app.get('/api/auth/user', (req, res) => {
  const token = req.cookies.discord_session;
  const session = discordSessions.get(token);
  if (!session || Date.now() > session.expires) {
    if (session) discordSessions.delete(token);
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json(session.user);
});

app.post('/api/auth/logout', (req, res) => {
  const token = req.cookies.discord_session;
  discordSessions.delete(token);
  res.clearCookie('discord_session', { path: '/' });
  res.json({ ok: true });
});

app.post('/api/outfits', discordAuthMiddleware, (req, res) => {
  const fields = normalizeOutfitFields(req.body || {}, 'Streetwear', 7);
  if (!fields.title || !fields.desc) return res.status(400).json({ error: 'Title and description required' });

  const outfits = readJSON('outfits', DEFAULT_OUTFITS);
  const outfit = {
    id: crypto.randomUUID(),
    ...fields,
    likes: 0,
    pins: normalizeOutfitPins(req.body?.pins),
    author: req.discordUser.username,
    authorId: req.discordUser.id,
    createdAt: new Date().toISOString(),
  };

  const nextOutfits = [outfit, ...outfits].slice(0, 2000);
  writeJSON('outfits', nextOutfits);
  res.json({ outfit, message: 'Outfit created successfully' });
});


const IMG_FETCH_CONFIGS = [
  {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36',
    'Accept': 'image/avif,image/webp,image/apng,image*;q=0.8',
    'Referer': 'https://www.google.com/',
  },
  {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
    'Accept': 'image*;q=0.8',
    'Referer': 'https://weidian.com/',
  },
];

const imgProxyCache = new Map();
const imgProxyInFlight = new Map();
const IMG_CACHE_TTL = 60 * 60 * 1000;
const IMG_CACHE_MAX = 500;
const imageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zbyt wiele zapytań o obrazy, spróbuj za chwilę' },
});



const IMG_DISK_DIR = path.join(DATA_DIR, 'image-proxy-cache');
const IMG_DISK_META_FILE = path.join(DATA_DIR, 'image-proxy-cache.json');
const IMG_DISK_TTL = 7 * 24 * 60 * 60 * 1000;
const IMG_DISK_MAX_ENTRIES = 400;
const IMG_DISK_MAX_BYTES = 256 * 1024 * 1024;
let imgDiskMeta = {};
let imgDiskMetaSaveTimer = null;

try {
  if (!fs.existsSync(IMG_DISK_DIR)) fs.mkdirSync(IMG_DISK_DIR, { recursive: true });
} catch {}
try {
  const diskMeta = JSON.parse(fs.readFileSync(IMG_DISK_META_FILE, 'utf8'));
  if (diskMeta && typeof diskMeta === 'object') imgDiskMeta = diskMeta;
} catch {}

function imgDiskKey(url) {
  return crypto.createHash('sha1').update(String(url)).digest('hex');
}

function scheduleImgDiskMetaSave() {
  if (imgDiskMetaSaveTimer) clearTimeout(imgDiskMetaSaveTimer);
  imgDiskMetaSaveTimer = setTimeout(() => {
    imgDiskMetaSaveTimer = null;
    fs.promises.writeFile(IMG_DISK_META_FILE, JSON.stringify(imgDiskMeta)).catch(() => {});
  }, 200);
  imgDiskMetaSaveTimer.unref?.();
}

function trimImgDiskCache() {
  const entries = Object.entries(imgDiskMeta)
    .sort(([, a], [, b]) => Number(b?.ts || 0) - Number(a?.ts || 0));
  const kept = {};
  let totalBytes = 0;

  for (const [key, entry] of entries) {
    const size = Number(entry?.size || 0);
    if (Object.keys(kept).length < IMG_DISK_MAX_ENTRIES && totalBytes + size <= IMG_DISK_MAX_BYTES) {
      kept[key] = entry;
      totalBytes += size;
      continue;
    }
    try { fs.unlinkSync(path.join(IMG_DISK_DIR, entry.file || `${key}.bin`)); } catch {}
  }

  if (Object.keys(kept).length !== entries.length) {
    imgDiskMeta = kept;
    scheduleImgDiskMetaSave();
  }
}

function readImgDiskCache(url) {
  const key = imgDiskKey(url);
  const entry = imgDiskMeta[key];
  if (!entry) return null;

  if (Date.now() - Number(entry.ts || 0) >= IMG_DISK_TTL) {
    delete imgDiskMeta[key];
    try { fs.unlinkSync(path.join(IMG_DISK_DIR, entry.file || `${key}.bin`)); } catch {}
    scheduleImgDiskMetaSave();
    return null;
  }

  try {
    const buffer = fs.readFileSync(path.join(IMG_DISK_DIR, entry.file || `${key}.bin`));
    if (!buffer.length) return null;
    entry.ts = Date.now();
    return { buffer, contentType: entry.contentType || 'image/jpeg' };
  } catch {
    delete imgDiskMeta[key];
    scheduleImgDiskMetaSave();
    return null;
  }
}

function persistImgDiskCache(url, buffer, contentType) {

  if (!buffer || buffer.length === 0 || buffer.length > 8 * 1024 * 1024) return;
  const key = imgDiskKey(url);
  const file = `${key}.bin`;
  try {
    fs.writeFileSync(path.join(IMG_DISK_DIR, file), buffer);
    imgDiskMeta[key] = {
      url: String(url),
      file,
      contentType: contentType || 'image/jpeg',
      size: buffer.length,
      ts: Date.now(),
    };
    trimImgDiskCache();
    scheduleImgDiskMetaSave();
  } catch {}
}

function lruSet(map, key, value, max) {
  if (map.size >= max) map.delete(map.keys().next().value);
  map.set(key, value);
}

async function fetchProxyImage(url) {
  const running = imgProxyInFlight.get(url);
  if (running) return running;

  const pending = (async () => {
    let lastStatus = 0;
    for (const headers of IMG_FETCH_CONFIGS) {
      try {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(10000),
          redirect: 'follow',
          headers,
        });
        lastStatus = response.status;
        if (response.status === 429 || response.status === 403 || !response.ok) continue;
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.startsWith('image/')) continue;
        return { buffer: Buffer.from(await response.arrayBuffer()), contentType };
      } catch {}
    }
    throw new Error(`image fetch failed (${lastStatus || 'network'})`);
  })();

  imgProxyInFlight.set(url, pending);
  try {
    return await pending;
  } finally {
    if (imgProxyInFlight.get(url) === pending) imgProxyInFlight.delete(url);
  }
}

const IMG_PROXY_ALLOWED_DOMAINS = [
  'geilicdn.com', 'si.geilicdn.com', 'open.geilicdn.com',
  'weidian.com', 'img.weidian.com', 'ci.weidian.com',
  'alicdn.com', 'img.alicdn.com', 'gw.alicdn.com', 'cbu01.alicdn.com', 'img14.alicdn.com',
  '1688.com',
  'taobao.com', 'img.taobao.com',
  'tmall.com',
  'cnshopper.com',
  'kakobuy.com',
  'hoobuy.com',
  'uufinds.com', 'file.uufinds.com',
  'topbuyin.com', 'admintop.topbuyin.com',
  'bolobuy.shop', 'img.bolobuy.shop',
  'chiobet.com', 'img.chiobet.com',
  'acbuy.com',
  'postimg.cc', 'i.postimg.cc',
  'iili.io',
  'imgur.com', 'i.imgur.com', 'imgur.io',
  'cdn.scenesku.com', 'cdn.dummyjson.com',
  'vzjsexrlvhoxzhbqzute.supabase.co',
];

function normalizeImgurImageUrl(value) {
  const raw = String(value || '').trim();
  try {
    const u = new URL(raw);
    if (!/(^|\.)imgur\.com$|(^|\.)imgur\.io$/i.test(u.hostname)) return raw;
    if (/^i\.imgur\.com$/i.test(u.hostname)) return raw;

    const match = u.pathname.match(/^\/([^/]+?)(\.(?:jpe?g|png|webp|gif))?$/i);
    if (match && !/^(a|gallery|user|t|search)$/i.test(match[1])) {
      return `https://i.imgur.com/${match[1]}${match[2] || '.jpg'}`;
    }
  } catch {}
  return raw;
}

const imgurPageCache = new Map();
const IMGUR_PAGE_TTL = 60 * 60 * 1000;

async function resolveImgurPageImage(value) {
  const raw = String(value || '').trim();
  if (!/imgur\.com|imgur\.io/i.test(raw) || /^https?:\/\/i\.imgur\.com\//i.test(raw)) return raw;
  const cached = imgurPageCache.get(raw);
  if (cached && Date.now() - cached.ts < IMGUR_PAGE_TTL) return cached.url || raw;
  try {
    const page = await fetch(raw, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html' },
      redirect: 'follow',
      signal: AbortSignal.timeout(4500),
    });
    const html = await page.text();
    const match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    const image = match?.[1] ? match[1].replace(/&amp;/g, '&') : '';
    const resolved = /^https?:\/\//i.test(image) ? image : raw;
    imgurPageCache.set(raw, { ts: Date.now(), url: resolved });
    if (imgurPageCache.size > 500) imgurPageCache.delete(imgurPageCache.keys().next().value);
    return resolved;
  } catch {
    imgurPageCache.set(raw, { ts: Date.now(), url: '' });
    return raw;
  }
}

function isAllowedImgHost(urlStr) {
  try {
    const u = new URL(urlStr);
    if (/^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|0\.0\.0\.0|\[::1\])/i.test(u.hostname)) return false;
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    return IMG_PROXY_ALLOWED_DOMAINS.some(d => u.hostname === d || u.hostname.endsWith('.' + d));
  } catch {
    return false;
  }
}

app.get('/api/img', imageLimiter, async (req, res) => {
  let { url } = req.query;
  if (!url) return res.status(400).send('url required');
  url = normalizeImgurImageUrl(url);
  url = await resolveImgurPageImage(url);




  if (/topbuyin\.com.*[?&]url=/i.test(url)) {
    try {
      const inner = new URL(url).searchParams.get('url');
      if (inner) url = decodeURIComponent(inner);
    } catch {}
  }




  const isPreviewPage = /^https?:\/\/(?:www\.)?postimg\.cc(?:\/|$)/i.test(url)
    || /^https?:\/\/(?:www\.)?iili\.io(?:\/|$)/i.test(url);
  if (isPreviewPage) {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    return res.send(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="#0e1628"/><path d="M120 270l55-65 42 45 32-36 55 56H120z" fill="#18304a"/><circle cx="255" cy="145" r="24" fill="#244967"/><text x="200" y="330" fill="#5a8fa8" font-family="sans-serif" font-size="16" text-anchor="middle">preview niedostępny</text></svg>`);
  }

  if (!isAllowedImgHost(url)) {
    return res.status(400).json({ error: 'Image host not allowed' });
  }

  const candidates = /geilicdn\.com/i.test(url)
    ? [...new Set([url, stripResolutionSuffix(url)])]
    : [url];

  for (const candidate of candidates) {
    const cached = imgProxyCache.get(candidate);
    if (cached && Date.now() - cached.ts < IMG_CACHE_TTL) {
      res.setHeader('Content-Type', cached.contentType);
      res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
      res.setHeader('X-Cache', 'HIT');
      return res.send(cached.buffer);
    }

    const diskCached = readImgDiskCache(candidate);
    if (diskCached) {
      lruSet(imgProxyCache, candidate, { ...diskCached, ts: Date.now() }, IMG_CACHE_MAX);
      res.setHeader('Content-Type', diskCached.contentType);
      res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
      res.setHeader('X-Cache', 'DISK');
      return res.send(diskCached.buffer);
    }

    try {
      const { buffer, contentType } = await fetchProxyImage(candidate);
      lruSet(imgProxyCache, candidate, { buffer, contentType, ts: Date.now() }, IMG_CACHE_MAX);

      setImmediate(() => persistImgDiskCache(candidate, buffer, contentType));

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
      res.setHeader('X-Cache', 'MISS');
      return res.send(buffer);
    } catch {}
  }

  res.status(502).json({ error: 'Failed to fetch image' });
});

const imageCache = new Map();

app.get('/api/image/resolve', imageLimiter, async (req, res) => {
  const { url: rawUrl } = req.query;
  if (!rawUrl) return res.status(400).json({ error: 'url required' });
  res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');

  const key = unwrapAgentUrl(decodeURIComponent(rawUrl));
  const cached = imageCache.get(key);
  if (cached && Date.now() - cached.ts < 3600000) return res.json({ image: cached.image, cached: true });



  const persistedImage = imgCacheMap[key];
  if (persistedImage) {
    imageCache.set(key, { image: persistedImage, ts: Date.now() });
    return res.json({ image: persistedImage, cached: true, via: 'disk' });
  }

  if (/weidian\.com\/item\.html/i.test(key)) {
    const id = key.match(/itemID=(\d+)/)?.[1];
    if (id) {
      const img = await weidianImage(id);
      if (img) {
        imageCache.set(key, { image: img, ts: Date.now() });
        imgCacheMap[key] = img;
        setImmediate(saveImgCache);
        capMap(imageCache, 3000);
        return res.json({ image: img, via: 'weidian' });
      }
    }
  }



  imageCache.set(key, { image: null, ts: Date.now() });
  capMap(imageCache, 3000);
  res.json({ image: null, via: null });
});

const tokens = new Map();
const TOKEN_TTL = 24 * 60 * 60 * 1000;

function ensureDefaultAdmin() {
  const users = readJSON('users', []);
  if (users.find(u => u.username === 'admin')) return;

  const defaultPw = process.env.DEFAULT_ADMIN_PASSWORD || '';
  if (defaultPw.length < 12) {
    console.error('DEFAULT_ADMIN_PASSWORD must be at least 12 characters');
    return;
  }

  users.push({
    username: 'admin',
    passwordHash: bcrypt.hashSync(defaultPw, 12),
    createdAt: new Date().toISOString(),
    mustChangePassword: true,
  });
  writeJSON('users', users);
  console.log('Admin user created. Change password after first login!');
}

ensureDefaultAdmin();

function authMiddleware(req, res, next) {
  const token = req.cookies.cf_admin_token || req.headers.authorization?.replace('Bearer ', '');
  const t = tokens.get(token);
  if (!t || Date.now() > t.expires) {
    if (t) tokens.delete(token);
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.adminUser = t.user;
  req.mustChangePassword = t.mustChangePassword;
  next();
}

app.post('/api/admin/login', loginLimiter, (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const users = readJSON('users', []);
  const user = users.find(u => u.username === username);
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = crypto.randomUUID();
  tokens.set(token, { user: username, expires: Date.now() + TOKEN_TTL, mustChangePassword: user.mustChangePassword || false });

  res.cookie('cf_admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: TOKEN_TTL,
    path: '/',
  });

  res.json({ username, expiresIn: TOKEN_TTL, mustChangePassword: user.mustChangePassword || false });
});

app.get('/api/admin/me', authMiddleware, (req, res) => {
  res.json({ username: req.adminUser, mustChangePassword: req.mustChangePassword || false });
});

app.post('/api/admin/logout', authMiddleware, (req, res) => {
  const token = req.cookies.cf_admin_token || req.headers.authorization?.replace('Bearer ', '');
  tokens.delete(token);
  res.clearCookie('cf_admin_token', { path: '/' });
  res.json({ ok: true });
});

app.post('/api/admin/change-password', authMiddleware, (req, res) => {
  const { current, next } = req.body || {};
  if (!current || !next || next.length < 12) return res.status(400).json({ error: 'New password must be at least 12 characters' });

  const users = readJSON('users', []);
  const user = users.find(u => u.username === req.adminUser);
  if (!user || !bcrypt.compareSync(current, user.passwordHash)) {
    return res.status(401).json({ error: 'Current password is wrong' });
  }

  user.passwordHash = bcrypt.hashSync(next, 12);
  user.mustChangePassword = false;
  user.passwordChangedAt = new Date().toISOString();
  writeJSON('users', users);

  const token = req.cookies.cf_admin_token || req.headers.authorization?.replace('Bearer ', '');
  const t = tokens.get(token);
  if (t) t.mustChangePassword = false;

  res.json({ ok: true });
});

app.get('/api/admin/stats', authMiddleware, (_req, res) => {
  const products = getProducts();
  const favs = readJSON('favorites', []);
  res.json({
    products: products.length,
    linked: products.filter(p => p.buyUrl).length,
    withImages: products.filter(p => p.img).length,
    categories: [...new Set(products.map(p => p.cat))].length,
    favorites: favs.length,
    lastSheetFetch: new Date(lastFetch).toISOString(),
    sheetMode: GOOGLE_API_KEY ? 'API' : 'CSV',
  });
});

function getAdminSheets() {
  const config = readJSON('sheets', { sheets: [] });
  return (Array.isArray(config.sheets) ? config.sheets : []).map((sheet, index) => ({
    key: String(sheet.key || `legacy-${index}`),
    url: String(sheet.url || sheet.id || ''),
    tab: String(sheet.tab || ''),
    gid: String(sheet.gid || ''),
    gender: normalizeSheetGender(sheet.gender),
    category: normalizeSheetCategory(sheet.category),
    range: String(sheet.range || ''),
    cols: sheet.cols || null,
    headerRow: sheet.headerRow || null,
    autoDetected: sheet.autoDetected === true,
    sections: sheet.sections !== false,
  }));
}

app.get('/api/admin/sheets', authMiddleware, (_req, res) => {
  res.json(getAdminSheets());
});

app.get('/api/admin/sheets/inspect', authMiddleware, async (req, res) => {
  const url = safeHttpUrl(req.query?.url);
  const sheetId = extractSheetId(url);
  if (!url || !/^https?:\/\/docs\.google\.com\/spreadsheets\/d\//i.test(url) || sheetId === url) {
    return res.status(400).json({ error: 'Podaj poprawny publiczny link do Google Sheets' });
  }

  try {
    res.json(await inspectGoogleSpreadsheet(sheetId, url));
  } catch (error) {
    console.error('Sheet inspect error:', error.message);
    res.status(502).json({ error: 'Nie udało się odczytać arkusza. Sprawdź publiczny dostęp i klucz Google API.' });
  }
});

app.post('/api/admin/sheets', authMiddleware, async (req, res) => {
  const url = safeHttpUrl(req.body?.url);
  const sheetId = extractSheetId(url);
  if (!url || !/^https?:\/\/docs\.google\.com\/spreadsheets\/d\//i.test(url) || sheetId === url) {
    return res.status(400).json({ error: 'Podaj poprawny publiczny link do Google Sheets' });
  }

  let inspected;
  try {
    inspected = await inspectGoogleSpreadsheet(sheetId, url);
  } catch (error) {
    console.error('Sheet inspect error:', error.message);
    return res.status(502).json({ error: 'Nie udało się odczytać arkusza. Sprawdź publiczny dostęp i klucz Google API.' });
  }

  const requestedTab = String(req.body?.tab || '').trim().slice(0, 120);
  const selectedTabs = requestedTab
    ? inspected.sheets.filter(sheet => sheet.tab === requestedTab)
    : inspected.sheets.filter(sheet => sheet.hasData);
  if (!selectedTabs.length) {
    return res.status(400).json({ error: requestedTab ? `Nie znaleziono zakładki „${requestedTab}”` : 'Arkusz nie zawiera danych do importu' });
  }

  const requestedGender = normalizeSheetGender(req.body?.gender);
  const requestedCategory = normalizeSheetCategory(req.body?.category);
  const rangeInput = String(req.body?.range || '').trim().slice(0, 200);
  const config = readJSON('sheets', { sheets: [] });
  const sheets = Array.isArray(config.sheets) ? config.sheets : [];

  const newTabs = selectedTabs.filter(sheet => !sheets.some(existing => (
    extractSheetId(existing.url || existing.id) === sheetId &&
    String(existing.gid || '') === String(sheet.gid) &&
    String(existing.tab || '') === sheet.tab
  )));
  if (!newTabs.length) {
    return res.status(409).json({ error: 'Wszystkie wykryte zakladki z tego arkusza sa juz dodane' });
  }

  for (const sheet of newTabs) {
    sheets.push({
      key: crypto.randomUUID(),
      url,
      gid: sheet.gid,
      tab: sheet.tab,
      gender: requestedGender === 'auto' ? sheet.gender : requestedGender,
      category: requestedCategory === 'auto' ? sheet.category : requestedCategory,
      range: rangeInput || sheet.range,
      cols: sheet.cols,
      headerRow: sheet.headerRow,
      autoDetected: true,
      sections: req.body?.sections !== false,
    });
  }
  writeJSON('sheets', { sheets });
  getConfiguredSheetSources();
  lastFetch = 0;
  refreshing = false;
  await refreshProducts();

  return res.json({ ok: true, detected: newTabs, sheets: getAdminSheets(), products: getProducts().length });

  if (sheets.some(sheet => extractSheetId(sheet.url || sheet.id) === sheetId && String(sheet.tab || '') === tab)) {
    return res.status(409).json({ error: 'Ten arkusz i zakładka są już dodane' });
  }

  sheets.push({
    key: crypto.randomUUID(),
    url,
    tab,
    gender,
    category,
    range,
    sections: req.body?.sections !== false,
  });
  writeJSON('sheets', { sheets });
  getConfiguredSheetSources();
  lastFetch = 0;
  refreshing = false;
  await refreshProducts();

  res.json({ ok: true, sheets: getAdminSheets(), products: getProducts().length });
});

app.delete('/api/admin/sheets/:key', authMiddleware, async (req, res) => {
  const config = readJSON('sheets', { sheets: [] });
  const sheets = Array.isArray(config.sheets) ? config.sheets : [];
  const index = sheets.findIndex((sheet, i) => String(sheet.key || `legacy-${i}`) === req.params.key);
  if (index < 0) return res.status(404).json({ error: 'Arkusz nie znaleziony' });

  sheets.splice(index, 1);
  writeJSON('sheets', { sheets });
  getConfiguredSheetSources();
  lastFetch = 0;
  refreshing = false;
  await refreshProducts();

  res.json({ ok: true, sheets: getAdminSheets(), products: getProducts().length });
});

app.post('/api/admin/refresh', authMiddleware, async (_req, res) => {
  lastFetch = 0;
  refreshing = false;
  await refreshProducts();
  const products = getProducts();
  res.json({
    ok: true,
    products: products.length,
    withImages: products.filter(p => p.img).length,
    linked: products.filter(p => p.buyUrl).length,
  });
});

app.put('/api/admin/agents/:name', authMiddleware, (req, res) => {
  const name = req.params.name;
  const agent = AGENTS.find(a => a.name.toLowerCase() === name.toLowerCase());
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  const overrides = readJSON('agent-overrides', {});
  const shipping = req.body?.shipping === undefined ? undefined : String(req.body.shipping).trim().slice(0, 240);
  const coupon = req.body?.coupon === undefined ? undefined : String(req.body.coupon).trim().slice(0, 240);
  const affLink = req.body?.affLink === undefined ? undefined : safeHttpUrl(req.body.affLink);
  const tag = req.body?.tag === undefined ? undefined : String(req.body.tag).trim().slice(0, 80);
  overrides[agent.name] = {
    ...overrides[agent.name],
    ...(shipping !== undefined && { shipping }),
    ...(coupon !== undefined && { coupon }),
    ...(affLink !== undefined && { affLink }),
    ...(tag !== undefined && { tag }),
  };
  writeJSON('agent-overrides', overrides);
  res.json(getAgents());
});

app.delete('/api/admin/agents/:name', authMiddleware, (req, res) => {
  const overrides = readJSON('agent-overrides', {});
  delete overrides[req.params.name];
  writeJSON('agent-overrides', overrides);
  res.json(getAgents());
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, _req, res, _next) => {
  console.error('Request failed:', err.message);
  if (res.headersSent) return;
  res.status(500).json({ error: 'Internal server error' });
});

const buildPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
  app.get('*', (_req, res) => res.sendFile(path.join(buildPath, 'index.html')));
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`KyzReps running on port ${PORT} — ${getProducts().length} products`);
});
