import { z } from 'zod';
import shopLocationsJson from '../data/shop-locations.json';
import type {
  ScheduleDay,
  Shop,
  ShopCategory,
  ShopDetail,
  ShopImage,
  ShopLink,
  ShopLocation,
} from '../trpc/routers/shop';

// SOS OpenAPIのレスポンスZodスキーマ定義
const SosPublicInfoSchema = z.object({
  description: z.string().nullable().optional(),
  iconFileId: z.string().nullable().optional(),
  mapImageFileIds: z.array(z.string()).optional(),
  websiteUrls: z.array(z.string()).optional(),
  xIds: z.array(z.string()).optional(),
  instagramIds: z.array(z.string()).optional(),
  youtubeIds: z.array(z.string()).optional(),
  openStatus: z.enum(['OPEN', 'CLOSED', 'NOT_APPLICABLE']),
  stockStatus: z.enum(['IN_STOCK', 'OUT_OF_STOCK', 'NOT_APPLICABLE']),
});

const SosPublicProjectSchema = z.object({
  id: z.string(),
  number: z.number().int(),
  name: z.string(),
  organizationName: z.string(),
  type: z.enum(['STAGE', 'FOOD', 'NORMAL']),
  location: z.enum(['INDOOR', 'OUTDOOR', 'STAGE']),
  publicInfo: SosPublicInfoSchema,
  customFields: z.record(z.string(), z.unknown()).nullable().optional(),
});

const SosPublicProjectListSchema = z.array(SosPublicProjectSchema);

export type SosPublicProject = z.infer<typeof SosPublicProjectSchema>;

// マッピング用ヘルパー関数
function mapCategory(type: 'STAGE' | 'FOOD' | 'NORMAL'): ShopCategory {
  switch (type) {
    case 'FOOD':
      return '食品';
    case 'STAGE':
      return 'ステージ';
    case 'NORMAL':
    default:
      return 'その他';
  }
}

const SCHEDULE_DAYS = [
  '前夜祭',
  'Day1',
  'Day2',
] as const satisfies ScheduleDay[];

// 企画番号 → 実施場所。scripts/import-shop-locations.ts で企画実施場所一覧から生成する。
const SHOP_LOCATIONS: Record<string, ShopLocation[]> = z
  .record(
    z.string(),
    z.array(
      z.object({
        placeId: z.string(),
        room: z.string().optional(),
        days: z.array(z.enum(SCHEDULE_DAYS)),
      }),
    ),
  )
  .parse(shopLocationsJson);

// ステージ企画の会場は、SOS のカスタム項目に入る略称で決まる。
const STAGE_FIELD = 'ステージ実施場所 確定';
const STAGE_PLACE_IDS: Record<string, string> = {
  '1A': 'stage-1a',
  UNI: 'stage-united',
  '会館（講堂）': 'stage-kaikan-kodo',
  '会館（ホール）': 'stage-kaikan-hall',
};

/** 企画の実施場所を返す。分からない企画は空配列（表示上は「未定」）。 */
function mapLocations(project: SosPublicProject): ShopLocation[] {
  const listed = SHOP_LOCATIONS[project.number];
  if (listed) return listed;
  const stage = project.customFields?.[STAGE_FIELD];
  const placeId =
    typeof stage === 'string' ? STAGE_PLACE_IDS[stage] : undefined;
  return placeId ? [{ placeId }] : [];
}

/** 実施場所ごとの実施日を合わせた、企画全体の実施日。日付の分からない企画は本祭2日間とする。 */
function scheduleOf(locations: ShopLocation[]): ScheduleDay[] {
  const days = new Set(locations.flatMap((location) => location.days ?? []));
  return days.size > 0
    ? SCHEDULE_DAYS.filter((day) => days.has(day))
    : ['Day1', 'Day2'];
}

function mapTags(
  type: 'STAGE' | 'FOOD' | 'NORMAL',
  location: 'INDOOR' | 'OUTDOOR' | 'STAGE',
): string[] {
  const tags: string[] = [];
  if (type === 'FOOD') tags.push('飲食');
  if (type === 'STAGE') tags.push('音楽');
  if (location === 'INDOOR') tags.push('屋内');
  if (location === 'OUTDOOR') tags.push('屋外');
  return tags;
}

// SOS の画像 API が縮小を受け付ける幅（px）。
const IMAGE_WIDTHS = [160, 320, 640, 1280] as const;

function toShopImage(baseUrl: string, fileId: string): ShopImage {
  const url = `${baseUrl}/openapi/images/${fileId}`;
  return {
    src: `${url}?width=640`,
    srcSet: IMAGE_WIDTHS.map((w) => `${url}?width=${w} ${w}w`).join(', '),
  };
}

// URL に使うため、桁数をそろえて辞書順と番号順を一致させる。
function formatShopNumber(number: number): string {
  return String(number).padStart(3, '0');
}

function mapToShop(project: SosPublicProject, baseUrl: string): Shop {
  const { iconFileId } = project.publicInfo;
  const locations = mapLocations(project);
  return {
    id: project.id,
    number: formatShopNumber(project.number),
    name: project.name,
    organization: project.organizationName,
    locations,
    schedule: scheduleOf(locations),
    category: mapCategory(project.type),
    tags: mapTags(project.type, project.location),
    thumbnail: iconFileId ? toShopImage(baseUrl, iconFileId) : undefined,
    cancelled: project.publicInfo.openStatus === 'CLOSED',
  };
}

const HANDLE_PATTERN = /^[\w.-]+$/;

const xLink = (id: string): ShopLink => ({
  kind: 'x',
  label: `@${id}`,
  url: `https://x.com/${id}`,
});

const instagramLink = (id: string): ShopLink => ({
  kind: 'instagram',
  label: `@${id}`,
  url: `https://www.instagram.com/${id}/`,
});

// YouTube はハンドル（例: folktkb）とチャンネル名（例: 「〇〇班げんしけん」）が混在して
// 登録されている。チャンネル名からはチャンネル URL を作れないため検索結果へ飛ばす。
function youtubeLink(id: string): ShopLink {
  if (/^UC[\w-]{22}$/.test(id)) {
    return {
      kind: 'youtube',
      label: 'YouTube',
      url: `https://www.youtube.com/channel/${id}`,
    };
  }
  if (HANDLE_PATTERN.test(id)) {
    return {
      kind: 'youtube',
      label: `@${id}`,
      url: `https://www.youtube.com/@${id}`,
    };
  }
  return {
    kind: 'youtube',
    label: id,
    url: `https://www.youtube.com/results?search_query=${encodeURIComponent(id)}`,
  };
}

// Webサイト欄に SNS のプロフィール URL が入っていることがあるため、
// ドメインで種類を判定し、SNS ならユーザー名に正規化して重複を除けるようにする。
function linkFromUrl(raw: string): ShopLink | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const host = url.host.replace(/^(www|mobile|m)\./, '');
  // Instagram / Facebook のプロフィールからコピーした URL は転送用ラッパーになっている。
  const wrapped = url.searchParams.get('u');
  if ((host === 'l.instagram.com' || host === 'l.facebook.com') && wrapped) {
    return linkFromUrl(wrapped);
  }
  const first = url.pathname.split('/').find((s) => s !== '');

  if ((host === 'x.com' || host === 'twitter.com') && first) {
    return xLink(first.replace(/^@/, ''));
  }
  if (host === 'instagram.com' && first) return instagramLink(first);
  if (host === 'youtube.com' && first?.startsWith('@')) {
    return youtubeLink(first.slice(1));
  }
  if (host === 'youtube.com' || host === 'youtu.be') {
    return { kind: 'youtube', label: 'YouTube', url: raw };
  }
  return { kind: 'website', label: host, url: raw };
}

// SNS の ID 欄には "@xxx" や URL そのものが入ることがあるため正規化する。
function linkFromId(
  raw: string,
  fromHandle: (id: string) => ShopLink,
): ShopLink | null {
  const value = raw.trim();
  if (value === '') return null;
  if (/^https?:\/\//.test(value)) return linkFromUrl(value);
  return fromHandle(value.replace(/^@/, ''));
}

function mapLinks(info: SosPublicProject['publicInfo']): ShopLink[] {
  const links = [
    ...(info.websiteUrls ?? []).map((url) => linkFromUrl(url.trim())),
    ...(info.xIds ?? []).map((id) => linkFromId(id, xLink)),
    ...(info.instagramIds ?? []).map((id) => linkFromId(id, instagramLink)),
    ...(info.youtubeIds ?? []).map((id) => linkFromId(id, youtubeLink)),
  ].filter((link): link is ShopLink => link !== null);

  const seen = new Set<string>();
  return links
    .filter((link) => {
      const key = `${link.kind}:${link.label.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => LINK_ORDER.indexOf(a.kind) - LINK_ORDER.indexOf(b.kind));
}

const LINK_ORDER: ShopLink['kind'][] = ['website', 'x', 'instagram', 'youtube'];

function mapToShopDetail(
  project: SosPublicProject,
  baseUrl: string,
): ShopDetail {
  const images = (project.publicInfo.mapImageFileIds ?? []).map((fileId) =>
    toShopImage(baseUrl, fileId),
  );

  return {
    ...mapToShop(project, baseUrl),
    description: project.publicInfo.description || '詳細説明はありません。',
    images,
    links: mapLinks(project.publicInfo),
  };
}

const sampleImage: ShopImage = { src: '/sample/dog.jpg' };

const sampleDescription =
  '詳細説明詳細説明説明説明説明せつめいせつめ詳細説明詳細説明説明説明説明せつめいせつめ詳細説明詳細説明説明説明説明せつめいせつめ詳細説明詳細説明説明説明説明せつめいせつめ詳細説明詳細説明説明説明説明せつめいせつめ詳細説明詳細説明説明説明説明せつめいせつめ詳細説明詳細説明説明説明説明せつめいせつめ';

const fallbackShopDetails: ShopDetail[] = [
  {
    id: '1',
    number: '001',
    name: '猫大好き委員会',
    organization: '実施団体名',
    locations: [{ placeId: 'bldg-5c', room: '305' }],
    schedule: ['前夜祭', 'Day1', 'Day2'],
    category: '展示',
    tags: ['動物', '癒し', '屋内'],
    description: sampleDescription,
    images: [sampleImage, sampleImage, sampleImage],
    links: [],
  },
  {
    id: '2',
    number: '002',
    name: 'あああああああああああああああああああああ',
    organization: '実施団体名',
    locations: [{ placeId: 'bldg-1a', room: '101' }],
    schedule: ['前夜祭', 'Day1', 'Day2'],
    category: '食品',
    tags: ['屋外', '軽食'],
    cancelled: true,
    description: sampleDescription,
    images: [sampleImage, sampleImage],
    links: [],
  },
  {
    id: '3',
    number: '003',
    name: 'つくば学園祭企画名企画名企画名企画名',
    organization: '実施団体名',
    locations: [{ placeId: 'bldg-2c', room: '204' }],
    schedule: ['Day1', 'Day2'],
    category: '学術',
    tags: ['研究', '屋内'],
    description: sampleDescription,
    images: [sampleImage],
    links: [],
  },
  {
    id: '4',
    number: '004',
    name: 'つくば学園祭企画名企画名企画名企画名',
    organization: '実施団体名',
    locations: [{ placeId: 'stage-united' }],
    schedule: ['Day2'],
    category: 'ステージ',
    tags: ['音楽', '屋外'],
    description: sampleDescription,
    images: [sampleImage, sampleImage, sampleImage],
    links: [],
  },
  {
    id: '5',
    number: '005',
    name: 'つくば学園祭企画名企画名企画名企画名',
    organization: '実施団体名',
    locations: [{ placeId: 'bldg-1b', room: '110' }],
    schedule: ['前夜祭', 'Day1'],
    category: '物販',
    tags: ['グッズ', '屋内'],
    description: sampleDescription,
    images: [sampleImage, sampleImage],
    links: [],
  },
  {
    id: '6',
    number: '006',
    name: 'つくば学園祭企画名企画名企画名企画名',
    organization: '実施団体名',
    locations: [{ placeId: 'stage-united' }],
    schedule: ['前夜祭', 'Day1', 'Day2'],
    category: '食品',
    tags: ['屋外', 'スイーツ'],
    description: sampleDescription,
    images: [sampleImage, sampleImage, sampleImage],
    links: [],
  },
];

function toShop(detail: ShopDetail): Shop {
  const {
    description: _description,
    images: _images,
    links: _links,
    ...shop
  } = detail;
  return shop;
}

export class SosClientError extends Error {
  constructor(
    public readonly code: 'NOT_FOUND' | 'UPSTREAM',
    message: string,
  ) {
    super(message);
  }
}

// 企画一覧をこの期間キャッシュする。企画一覧は頻繁には変わらない一方、
// shop.list・shop.detail・grandprix.submit（投票時のID検証）から
// 呼ばれるため、毎回外部APIを叩かないようにする。
const SHOPS_CACHE_TTL_MS = 30_000;

type ShopDetails = { details: ShopDetail[]; isFallback: boolean };

// HTTPクライアント
export class SosClient {
  private baseUrl: string;
  private cache: (ShopDetails & { expiresAt: number }) | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * SOS API から企画一覧を取得し、Shop配列にマッピングして返却します。
   * 短時間キャッシュするため、連続した呼び出しは外部APIを叩きません。
   */
  async getShops(): Promise<Shop[]> {
    return (await this.getCachedDetails()).details.map(toShop);
  }

  /**
   * SOS API から実際に取得できた企画一覧だけを返す。取得に失敗してダミーデータに
   * フォールバックした場合は投票の検証に使えないため、例外を投げる。
   */
  async getLiveShops(): Promise<Shop[]> {
    const { details, isFallback } = await this.getCachedDetails();
    if (isFallback) {
      throw new SosClientError(
        'UPSTREAM',
        'SOS API から企画一覧を取得できません',
      );
    }
    return details.map(toShop);
  }

  /**
   * 3桁ゼロ埋めの企画番号（例: "001"）から企画詳細を返す。
   */
  async getShopDetail(number: string): Promise<ShopDetail> {
    const { details, isFallback } = await this.getCachedDetails();
    const detail = details.find((shop) => shop.number === number);
    if (detail) return detail;
    if (isFallback) {
      throw new SosClientError(
        'UPSTREAM',
        `SOS API is unavailable and fallback data has no shop: ${number}`,
      );
    }
    throw new SosClientError('NOT_FOUND', `店舗が見つかりません: ${number}`);
  }

  private async getCachedDetails(): Promise<ShopDetails> {
    if (this.cache && this.cache.expiresAt > Date.now()) {
      return this.cache;
    }

    const details = await this.fetchDetails();
    this.cache = { ...details, expiresAt: Date.now() + SHOPS_CACHE_TTL_MS };
    return details;
  }

  // 公開APIの一覧は詳細と同じ項目を返し、企画番号で引くエンドポイントもないため、
  // 詳細も一覧から作る。
  private async fetchDetails(): Promise<ShopDetails> {
    const fallback = { details: fallbackShopDetails, isFallback: true };

    if (!this.baseUrl) {
      console.warn(
        'SOS_API_URL is not defined. Falling back to dummy shop data.',
      );
      return fallback;
    }

    try {
      const response = await fetch(`${this.baseUrl}/openapi/projects`, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.statusText}`);
      }

      const json = await response.json();
      const parsed = SosPublicProjectListSchema.parse(json);
      return {
        details: parsed.map((project) =>
          mapToShopDetail(project, this.baseUrl),
        ),
        isFallback: false,
      };
    } catch (error) {
      console.warn(
        'Failed to fetch SOS projects. Falling back to dummy shop data.',
        error,
      );
      return fallback;
    }
  }
}

// Workers ではリクエストごとに env が渡されるが、企画一覧のキャッシュは
// isolate が生きている間リクエストをまたいで使い回したいので、インスタンスを保持する。
const clients = new Map<string, SosClient>();

export function getSosClient(baseUrl: string): SosClient {
  let client = clients.get(baseUrl);
  if (!client) {
    client = new SosClient(baseUrl);
    clients.set(baseUrl, client);
  }
  return client;
}
