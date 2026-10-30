import type { LocationPoint } from 'api';
import { MAX_POINTS_PER_REPORT } from 'api/domain/crowdConstants';

// 30秒ごとに、その間の経路を5秒刻みで送る。5秒ごとに精度のいちばんよい位置を残し、
// 30秒の中でいちばん精度のよいものを代表の位置にする。
const SAMPLE_MS = 5_000;
const REPORT_MS = 30_000;
const ENDPOINT = '/telemetry/location';
const DEVICE_KEY = 'tanpopo-crowd-device';
const DB_NAME = 'tanpopo-crowd';
const STORE = 'queue';

let started = false;
let fixes: GeolocationPosition[] = [];
let windowStart = 0;
let flushing = false;
// IndexedDB が使えない端末（プライベートブラウズなど）では、開いている間だけメモリに貯める。
let memoryQueue: LocationPoint[] = [];

let memoryDeviceId: string | undefined;

/** 端末の ID。LINE のログインや cookie とは結びつけず、端末内で作ったランダムな値を使い続ける。 */
function deviceId(): string {
  try {
    const saved = localStorage.getItem(DEVICE_KEY);
    if (saved) return saved;
    const id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
    return id;
  } catch {
    memoryDeviceId ??= crypto.randomUUID();
    return memoryDeviceId;
  }
}

function toPoint(
  { coords, timestamp }: GeolocationPosition,
  primary: boolean,
): LocationPoint {
  return {
    t: Math.round(timestamp),
    lat: coords.latitude,
    lng: coords.longitude,
    accuracy: coords.accuracy,
    altitude: coords.altitude,
    altitudeAccuracy: coords.altitudeAccuracy,
    heading: Number.isNaN(coords.heading) ? null : coords.heading,
    speed: coords.speed,
    primary,
  };
}

const moreAccurate = (a: GeolocationPosition, b: GeolocationPosition) =>
  a.coords.accuracy <= b.coords.accuracy ? a : b;

/** 貯めた位置を5秒ごとに1点へ間引き、いちばん精度のよい1点に代表の印を付ける。 */
export function samplePoints(
  positions: GeolocationPosition[],
): LocationPoint[] {
  const bySlot = new Map<number, GeolocationPosition>();
  for (const position of positions) {
    const slot = Math.floor(position.timestamp / SAMPLE_MS);
    const current = bySlot.get(slot);
    bySlot.set(slot, current ? moreAccurate(current, position) : position);
  }
  const samples = [...bySlot.values()];
  const primary = samples.reduce(moreAccurate);
  return samples.map((sample) => toPoint(sample, sample === primary));
}

// ---- 送れなかった分を貯める（IndexedDB） ----

let dbPromise: Promise<IDBDatabase | null> | undefined;

function openDb(): Promise<IDBDatabase | null> {
  dbPromise ??= new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore(STORE, { autoIncrement: true });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

const done = (request: IDBRequest | IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    if ('oncomplete' in request) {
      request.oncomplete = () => resolve();
      request.onerror = () => reject(request.error);
    } else {
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    }
  });

async function enqueue(points: LocationPoint[]) {
  const db = await openDb();
  if (!db) {
    memoryQueue.push(...points);
    return;
  }
  const tx = db.transaction(STORE, 'readwrite');
  for (const point of points) tx.objectStore(STORE).add(point);
  await done(tx);
}

/** 古い順に、1回で送れる件数だけ取り出す。 */
async function peek(): Promise<{
  keys: IDBValidKey[];
  points: LocationPoint[];
}> {
  const db = await openDb();
  if (!db) {
    return { keys: [], points: memoryQueue.slice(0, MAX_POINTS_PER_REPORT) };
  }
  const keys: IDBValidKey[] = [];
  const points: LocationPoint[] = [];
  const cursor = db.transaction(STORE).objectStore(STORE).openCursor();
  await new Promise<void>((resolve) => {
    cursor.onsuccess = () => {
      const current = cursor.result;
      if (!current || points.length >= MAX_POINTS_PER_REPORT) return resolve();
      keys.push(current.key);
      points.push(current.value as LocationPoint);
      current.continue();
    };
    cursor.onerror = () => resolve();
  });
  return { keys, points };
}

async function remove(keys: IDBValidKey[], count: number) {
  const db = await openDb();
  if (!db) {
    memoryQueue = memoryQueue.slice(count);
    return;
  }
  const tx = db.transaction(STORE, 'readwrite');
  for (const key of keys) tx.objectStore(STORE).delete(key);
  await done(tx);
}

/**
 * 貯まっている位置を古い順に送る。通信が途切れているときは貯めたままにし、次の機会に送る。
 * ページを離れる・裏に回る直前は keepalive で送り、ページが閉じても送信を続けさせる。
 */
async function flush(keepalive = false) {
  if (flushing) return;
  flushing = true;
  try {
    for (;;) {
      const { keys, points } = await peek();
      if (points.length === 0) return;
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: deviceId(), points }),
        keepalive,
      }).catch(() => null);
      // 400 は送り直しても受け付けられないため、貯めたままにせず捨てる。
      if (!response || (!response.ok && response.status !== 400)) return;
      await remove(keys, points.length);
    }
  } finally {
    flushing = false;
  }
}

/** 30秒の区切りを過ぎていたら、その間の位置を送る分として貯める。 */
async function closeWindow(now: number, force = false) {
  if (!force && now - windowStart < REPORT_MS) return;
  windowStart = now;
  const positions = fixes;
  fixes = [];
  if (positions.length > 0) await enqueue(samplePoints(positions));
  await flush(force);
}

/**
 * 人流の把握のため、位置情報を30秒ごとにサーバーへ送り始める。何度呼んでも1回だけ始める。
 * 位置情報の説明に同意し、位置情報が許可されているときだけ呼ぶ。止めるのはページを閉じたときと、
 * 位置情報の許可を取り消したとき。
 */
export function startCrowdReport() {
  if (started || !('geolocation' in navigator) || !window.isSecureContext) {
    return;
  }
  started = true;
  windowStart = Date.now();

  const onHidden = () => {
    // 裏に回ると多くのスマホでは位置も時計も止まるため、その前に手元の分を送り切る。
    if (document.visibilityState === 'hidden') {
      void closeWindow(Date.now(), true);
    }
  };
  // 位置が届かない間（止まっている・屋内など）も、貯まった分の区切りと再送は進める。
  const intervalId = setInterval(() => void closeWindow(Date.now()), SAMPLE_MS);
  // 30秒の区切りでまとめるため、測った位置は使い回さず毎回測り直させる。
  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      fixes.push(position);
      void closeWindow(Date.now());
    },
    (error) => {
      if (error.code !== error.PERMISSION_DENIED) return;
      navigator.geolocation.clearWatch(watchId);
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onHidden);
      started = false;
    },
    { enableHighAccuracy: true, maximumAge: 0 },
  );
  document.addEventListener('visibilitychange', onHidden);
  void flush();
}
