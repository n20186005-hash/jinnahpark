// Open-Meteo 免费天气 API 的服务端获取 + 缓存工具
// API: https://open-meteo.com/en/docs — 无需密钥，适合非盈利项目
// 缓存策略：Cloudflare Cache API（跨请求/跨区域）+ 进程内存缓存（本地 dev fallback）

export interface CurrentWeather {
  time: string;
  temperature_2m: number;
  relative_humidity_2m: number;
  apparent_temperature: number;
  is_day: number;
  precipitation: number;
  weather_code: number;
  wind_speed_10m: number;
}

export interface DailyWeather {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_probability_max: number[];
  sunrise: string[];
  sunset: string[];
}

export interface WeatherResponse {
  current: CurrentWeather;
  daily: DailyWeather;
  timezone: string;
}

const API_BASE = 'https://api.open-meteo.com/v1/forecast';
const LATITUDE = '33.57992867333843'; // Jinnah Park, Rawalpindi
const LONGITUDE = '73.06731487734208';
const TIMEZONE = 'Asia/Karachi';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 分钟
const CACHE_KEY = 'https://jinnahpark-weather.local/jinnah-park-forecast';
const FETCH_TIMEOUT_MS = 8000;

type MemoryEntry = { data: WeatherResponse; at: number };
let memory: MemoryEntry | null = null;

interface CfCaches {
  default: {
    match(request: Request): Promise<Response | undefined>;
    put(request: Request, response: Response): Promise<void>;
  };
}

function getCfCache(): CfCaches['default'] | null {
  try {
    const g = globalThis as Record<string, unknown>;
    const cachesObj = g.caches as CfCaches | undefined;
    if (cachesObj && typeof cachesObj.default?.match === 'function') return cachesObj.default;
  } catch {
    // 非 Cloudflare 环境
  }
  return null;
}

function buildApiUrl(): string {
  const url = new URL(API_BASE);
  url.searchParams.set('latitude', LATITUDE);
  url.searchParams.set('longitude', LONGITUDE);
  url.searchParams.set('timezone', TIMEZONE);
  url.searchParams.set('forecast_days', '5');
  url.searchParams.set('windspeed_unit', 'kmh');
  url.searchParams.set(
    'current',
    'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m'
  );
  url.searchParams.set(
    'daily',
    'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset'
  );
  return url.toString();
}

async function fetchFromNetwork(): Promise<WeatherResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(buildApiUrl(), {
      headers: { Accept: 'application/json', 'User-Agent': 'jinnahpark-guide/1.0 (non-profit visitor guide)' },
      signal: controller.signal
    });
    if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
    return (await res.json()) as WeatherResponse;
  } finally {
    clearTimeout(timer);
  }
}

async function readFromCfCache(): Promise<WeatherResponse | null> {
  const cache = getCfCache();
  if (!cache) return null;
  try {
    const hit = await cache.match(new Request(CACHE_KEY));
    if (!hit) return null;
    return (await hit.json()) as WeatherResponse;
  } catch {
    return null;
  }
}

async function writeToCfCache(data: WeatherResponse): Promise<void> {
  const cache = getCfCache();
  if (!cache) return;
  try {
    await cache.put(
      new Request(CACHE_KEY),
      new Response(JSON.stringify(data), {
        headers: { 'Cache-Control': `public, max-age=${Math.floor(CACHE_TTL_MS / 1000)}` }
      })
    );
  } catch {
    // 缓存写入失败不影响返回数据
  }
}

/** 返回天气数据；任何失败（无网络/超时/解析错误）时返回 null，页面优雅降级 */
export async function getWeather(): Promise<WeatherResponse | null> {
  // 1. Cloudflare Cache API
  const cached = await readFromCfCache();
  if (cached) {
    memory = { data: cached, at: Date.now() };
    return cached;
  }

  // 2. 进程内缓存（30 分钟 TTL）
  if (memory && Date.now() - memory.at < CACHE_TTL_MS) return memory.data;

  // 3. 网络请求
  try {
    const data = await fetchFromNetwork();
    memory = { data, at: Date.now() };
    void writeToCfCache(data);
    return data;
  } catch {
    // 网络失败时尽量返回过期内存数据
    return memory ? memory.data : null;
  }
}

// ---- WMO weather code → 乌尔都语描述 ----
export function weatherCodeText(code: number): string {
  switch (code) {
    case 0: return 'صاف آسمان';
    case 1: return 'زیادہ تر صاف';
    case 2: return 'جزوی ابر آلود';
    case 3: return 'ابر آلود';
    case 45: case 48: return 'دھند';
    case 51: case 53: case 55: return 'بوندا باندی';
    case 56: case 57: return 'منجمد بوندا باندی';
    case 61: case 63: case 65: return 'بارش';
    case 66: case 67: return 'منجمد بارش';
    case 71: case 73: case 75: return 'برف باری';
    case 77: return 'برف کے دانے';
    case 80: case 81: case 82: return 'تیز بارش';
    case 85: case 86: return 'برف کے جھونکے';
    case 95: return 'گرج چمک';
    case 96: case 99: return 'گرج اور اولے';
    default: return 'موسم';
  }
}

export function weatherCodeIcon(code: number): string {
  switch (code) {
    case 0: return '☀️';
    case 1: return '🌤️';
    case 2: return '⛅';
    case 3: return '☁️';
    case 45: case 48: return '🌫️';
    case 51: case 53: case 55: return '🌦️';
    case 56: case 57: return '🌦️';
    case 61: case 63: case 65: return '🌧️';
    case 66: case 67: return '🌧️';
    case 71: case 73: case 75: return '🌨️';
    case 77: return '🌨️';
    case 80: case 81: case 82: return '🌧️';
    case 85: case 86: return '🌨️';
    case 95: return '⛈️';
    case 96: case 99: return '⛈️';
    default: return '🌡️';
  }
}

/** Open-Meteo 返回的 ISO 时间（如 "2026-09-01T05:52"）→ 乌尔都语 12 小时制 "5:52 صبح" */
export function formatTimeHM(iso: string): string {
  const m = /T(\d{2}):(\d{2})/.exec(iso);
  if (!m) return iso;
  let h = parseInt(m[1], 10);
  const mm = m[2];
  const suffix = h < 12 ? 'صبح' : 'شام';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${mm} ${suffix}`;
}

/** 'YYYY-MM-DD' → 乌尔都语 "پیر، 1"；用当地正午解析避免时区偏移 */
export function formatDayLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  return new Intl.DateTimeFormat('ur-PK', { weekday: 'long', day: 'numeric' }).format(d);
}
