// Open-Meteo 天气 API 的服务端获取与缓存工具
// API: https://open-meteo.com/en/docs
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
  uv_index_max: number[];
  wind_speed_10m_max: number[];
  sunrise: string[];
  sunset: string[];
}

export interface WeatherResponse {
  current: CurrentWeather;
  daily: DailyWeather;
  timezone: string;
}

const API_BASE = 'https://api.open-meteo.com/v1/forecast';
const LATITUDE = '33.5799287'; // Jinnah Park, Rawalpindi
const LONGITUDE = '73.0698898';
const TIMEZONE = 'Asia/Karachi';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 分钟
const CACHE_KEY = 'https://jinnahpark-weather.local/jinnah-park-forecast';
const FETCH_TIMEOUT_MS = 4500;

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
  url.searchParams.set('forecast_days', '7');
  url.searchParams.set('windspeed_unit', 'kmh');
  url.searchParams.set(
    'current',
    'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m'
  );
  url.searchParams.set(
    'daily',
    'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,wind_speed_10m_max,sunrise,sunset'
  );
  return url.toString();
}

// Provider time is local Asia/Karachi. Never present unbounded stale data as current.
export function parseWeather(raw: unknown): WeatherResponse {
 const d=raw as WeatherResponse;
 if(!d?.current||!d.daily||d.timezone!=='Asia/Karachi')throw new Error('Incomplete weather');
 const c=d.current,x=d.daily;
 const numeric=(v:unknown,min:number,max:number):number=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw new Error('Invalid weather value');return v;};
 const codes=new Set([0,1,2,3,45,48,51,53,55,56,57,61,63,65,66,67,71,73,75,77,80,81,82,85,86,95,96,99]);
 const code=(v:unknown)=>{if(typeof v!=='number'||!codes.has(v))throw new Error('Invalid weather code');};
 if(typeof c.time!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(c.time))throw new Error('Missing weather time');
 const stamp=Date.parse(c.time+'+05:00'),age=Date.now()-stamp;
 if(!Number.isFinite(stamp)||age>3*60*60*1000||age< -15*60*1000)throw new Error('Weather time outside freshness window');
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Karachi',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 if(c.time.slice(0,10)!==today)throw new Error('Weather date is not today');
 numeric(c.temperature_2m,-100,65);numeric(c.apparent_temperature,-120,80);numeric(c.relative_humidity_2m,0,100);numeric(c.wind_speed_10m,0,500);numeric(c.precipitation,0,500);if(c.is_day!==0&&c.is_day!==1)throw new Error('Invalid daylight');code(c.weather_code);
 const keys=['time','weather_code','temperature_2m_max','temperature_2m_min','precipitation_probability_max','uv_index_max','wind_speed_10m_max','sunrise','sunset'] as const;
 if(keys.some(k=>!Array.isArray(x[k])||x[k].length!==7))throw new Error('Incomplete forecast');
 x.time.forEach((date,i)=>{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw new Error('Invalid forecast date');
  if(i===0&&date!==today||i>0&&Date.parse(date)-Date.parse(x.time[i-1])!==86400000)throw new Error('Forecast date sequence');
  const min=numeric(x.temperature_2m_min[i],-100,65),max=numeric(x.temperature_2m_max[i],-100,65);if(min>max)throw new Error('Inverted temperature range');
  code(x.weather_code[i]);numeric(x.precipitation_probability_max[i],0,100);numeric(x.uv_index_max[i],0,50);numeric(x.wind_speed_10m_max[i],0,500);
  for(const value of[x.sunrise[i],x.sunset[i]])if(typeof value!=='string'||value.slice(0,10)!==date||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)||!Number.isFinite(Date.parse(value+'+05:00')))throw new Error('Invalid solar time');
 });
 return d;
}

async function fetchFromNetwork(): Promise<WeatherResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(buildApiUrl(), {
      headers: { Accept: 'application/json', 'User-Agent': 'jinnahpark-guide/1.0' },
      signal: controller.signal
    });
    if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
    return parseWeather(await res.json());
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
    return parseWeather(await hit.json());
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
  if (memory && Date.now() - memory.at < CACHE_TTL_MS) {
    try { return parseWeather(memory.data); } catch { memory = null; }
  }

  // 3. 网络请求
  try {
    const data = await fetchFromNetwork();
    memory = { data, at: Date.now() };
    void writeToCfCache(data);
    return data;
  } catch {
    // 网络失败时尽量返回过期内存数据
    return null;
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
  const d = new Date(`${dateStr}T12:00:00+05:00`);
  return new Intl.DateTimeFormat('ur-PK', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'Asia/Karachi' }).format(d);
}
