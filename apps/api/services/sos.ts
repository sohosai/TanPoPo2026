import { z } from 'zod';
import type {
  ScheduleDay,
  Shop,
  ShopCategory,
  ShopDetail,
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
  name: z.string(),
  organizationName: z.string(),
  type: z.enum(['STAGE', 'FOOD', 'NORMAL']),
  location: z.enum(['INDOOR', 'OUTDOOR', 'STAGE']),
  publicInfo: SosPublicInfoSchema,
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

function mapLocations(
  location: 'INDOOR' | 'OUTDOOR' | 'STAGE',
): ShopLocation[] {
  switch (location) {
    case 'STAGE':
      return [{ placeId: 'stage-united' }];
    case 'INDOOR':
      return [{ placeId: 'bldg-2c' }];
    case 'OUTDOOR':
    default:
      return [{ placeId: 'bldg-1a' }];
  }
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

function getFileUrl(
  baseUrl: string,
  fileId: string | null | undefined,
): string | undefined {
  if (!fileId) return undefined;
  return `${baseUrl}/files/${fileId}/content`;
}

function mapToShop(project: SosPublicProject, baseUrl: string): Shop {
  const iconUrl = getFileUrl(baseUrl, project.publicInfo.iconFileId);
  return {
    id: project.id,
    name: project.name,
    organization: project.organizationName,
    locations: mapLocations(project.location),
    schedule: ['Day1', 'Day2'] as ScheduleDay[], // スケジュールはTanPoPo側で一律設定
    category: mapCategory(project.type),
    tags: mapTags(project.type, project.location),
    thumbnail: iconUrl,
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
  const images = (project.publicInfo.mapImageFileIds || [])
    .map((fileId) => getFileUrl(baseUrl, fileId))
    .filter((url): url is string => !!url);

  return {
    ...mapToShop(project, baseUrl),
    description: project.publicInfo.description || '詳細説明はありません。',
    images,
    links: mapLinks(project.publicInfo),
  };
}

const sampleDescription =
  '詳細説明詳細説明説明説明説明せつめいせつめ詳細説明詳細説明説明説明説明せつめいせつめ詳細説明詳細説明説明説明説明せつめいせつめ詳細説明詳細説明説明説明説明せつめいせつめ詳細説明詳細説明説明説明説明せつめいせつめ詳細説明詳細説明説明説明説明せつめいせつめ詳細説明詳細説明説明説明説明せつめいせつめ';

const fallbackShopDetails: ShopDetail[] = [
  {
    id: '1',
    name: '猫大好き委員会',
    organization: '実施団体名',
    locations: [{ placeId: 'bldg-5c', room: '305' }],
    schedule: ['前夜祭', 'Day1', 'Day2'],
    category: '展示',
    tags: ['動物', '癒し', '屋内'],
    description: sampleDescription,
    images: ['/sample/dog.jpg', '/sample/dog.jpg', '/sample/dog.jpg'],
    links: [],
  },
  {
    id: '2',
    name: 'あああああああああああああああああああああ',
    organization: '実施団体名',
    locations: [{ placeId: 'bldg-1a', room: '101' }],
    schedule: ['前夜祭', 'Day1', 'Day2'],
    category: '食品',
    tags: ['屋外', '軽食'],
    cancelled: true,
    description: sampleDescription,
    images: ['/sample/dog.jpg', '/sample/dog.jpg'],
    links: [],
  },
  {
    id: '3',
    name: 'つくば学園祭企画名企画名企画名企画名',
    organization: '実施団体名',
    locations: [{ placeId: 'bldg-2c', room: '204' }],
    schedule: ['Day1', 'Day2'],
    category: '学術',
    tags: ['研究', '屋内'],
    description: sampleDescription,
    images: ['/sample/dog.jpg'],
    links: [],
  },
  {
    id: '4',
    name: 'つくば学園祭企画名企画名企画名企画名',
    organization: '実施団体名',
    locations: [{ placeId: 'stage-united' }],
    schedule: ['Day2'],
    category: 'ステージ',
    tags: ['音楽', '屋外'],
    description: sampleDescription,
    images: ['/sample/dog.jpg', '/sample/dog.jpg', '/sample/dog.jpg'],
    links: [],
  },
  {
    id: '5',
    name: 'つくば学園祭企画名企画名企画名企画名',
    organization: '実施団体名',
    locations: [{ placeId: 'bldg-1b', room: '110' }],
    schedule: ['前夜祭', 'Day1'],
    category: '物販',
    tags: ['グッズ', '屋内'],
    description: sampleDescription,
    images: ['/sample/dog.jpg', '/sample/dog.jpg'],
    links: [],
  },
  {
    id: '6',
    name: 'つくば学園祭企画名企画名企画名企画名',
    organization: '実施団体名',
    locations: [{ placeId: 'stage-united' }],
    schedule: ['前夜祭', 'Day1', 'Day2'],
    category: '食品',
    tags: ['屋外', 'スイーツ'],
    description: sampleDescription,
    images: ['/sample/dog.jpg', '/sample/dog.jpg', '/sample/dog.jpg'],
    links: [],
  },
];

function toFallbackShop(detail: ShopDetail): Shop {
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

// getShops() の結果をこの期間キャッシュする。企画一覧は頻繁には変わらない一方、
// shop.list（一覧表示）と grandprix.submit（投票時のID検証）の双方から
// 呼ばれるため、毎回外部APIを叩かないようにする。
const SHOPS_CACHE_TTL_MS = 30_000;

// HTTPクライアント
export class SosClient {
  private baseUrl: string;
  private shopsCache: {
    shops: Shop[];
    isFallback: boolean;
    expiresAt: number;
  } | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
    };
  }

  /**
   * SOS API から企画一覧を取得し、Shop配列にマッピングして返却します。
   * 短時間キャッシュするため、連続した呼び出しは外部APIを叩きません。
   */
  async getShops(): Promise<Shop[]> {
    return (await this.getCachedShops()).shops;
  }

  /**
   * SOS API から実際に取得できた企画一覧だけを返す。取得に失敗してダミーデータに
   * フォールバックした場合は投票の検証に使えないため、例外を投げる。
   */
  async getLiveShops(): Promise<Shop[]> {
    const { shops, isFallback } = await this.getCachedShops();
    if (isFallback) {
      throw new SosClientError(
        'UPSTREAM',
        'SOS API から企画一覧を取得できません',
      );
    }
    return shops;
  }

  private async getCachedShops(): Promise<{
    shops: Shop[];
    isFallback: boolean;
  }> {
    if (this.shopsCache && this.shopsCache.expiresAt > Date.now()) {
      return this.shopsCache;
    }

    const shops = await this.fetchShops();
    this.shopsCache = { ...shops, expiresAt: Date.now() + SHOPS_CACHE_TTL_MS };
    return shops;
  }

  private async fetchShops(): Promise<{ shops: Shop[]; isFallback: boolean }> {
    const fallback = {
      shops: fallbackShopDetails.map(toFallbackShop),
      isFallback: true,
    };

    if (!this.baseUrl) {
      console.warn(
        'SOS_API_URL is not defined. Falling back to dummy shop data.',
      );
      return fallback;
    }

    try {
      const response = await fetch(`${this.baseUrl}/openapi/projects`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.statusText}`);
      }

      const json = await response.json();
      const parsed = SosPublicProjectListSchema.parse(json);
      return {
        shops: parsed.map((project) => mapToShop(project, this.baseUrl)),
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

  /**
   * SOS API から特定の企画詳細を取得し、ShopDetailにマッピングして返却します。
   */
  async getShopDetail(id: string): Promise<ShopDetail> {
    if (!this.baseUrl) {
      console.warn(
        'SOS_API_URL is not defined. Falling back to dummy shop detail.',
      );
      const fallbackDetail = fallbackShopDetails.find((shop) => shop.id === id);
      if (!fallbackDetail) {
        throw new SosClientError(
          'UPSTREAM',
          `SOS API is unavailable and fallback data has no shop: ${id}`,
        );
      }
      return fallbackDetail;
    }

    try {
      const response = await fetch(`${this.baseUrl}/openapi/projects/${id}`, {
        headers: this.getHeaders(),
      });

      if (response.status === 404) {
        throw new SosClientError('NOT_FOUND', `店舗が見つかりません: ${id}`);
      }

      if (!response.ok) {
        throw new SosClientError(
          'UPSTREAM',
          `Failed to fetch project detail for ${id}: ${response.statusText}`,
        );
      }

      const json = await response.json();
      const parsed = SosPublicProjectSchema.parse(json);
      return mapToShopDetail(parsed, this.baseUrl);
    } catch (error) {
      if (error instanceof SosClientError) {
        throw error;
      }

      const fallbackDetail = fallbackShopDetails.find((shop) => shop.id === id);
      if (fallbackDetail) {
        console.warn(
          `Failed to fetch SOS project detail for ${id}. Falling back to dummy data.`,
          error,
        );
        return fallbackDetail;
      }

      throw new SosClientError(
        'UPSTREAM',
        `Failed to fetch project detail for ${id}`,
      );
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
