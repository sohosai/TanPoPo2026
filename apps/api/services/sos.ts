import { z } from 'zod';
import type { Shop, ShopDetail, ShopCategory, ShopLocation, ScheduleDay } from '../trpc/routers/shop';

// SOS OpenAPIのレスポンスZodスキーマ定義
const SosPublicInfoSchema = z.object({
  description: z.string().nullable().optional(),
  iconFileId: z.string().nullable().optional(),
  mapImageFileIds: z.array(z.string()).optional(),
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

function mapLocations(location: 'INDOOR' | 'OUTDOOR' | 'STAGE'): ShopLocation[] {
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

function mapTags(type: 'STAGE' | 'FOOD' | 'NORMAL', location: 'INDOOR' | 'OUTDOOR' | 'STAGE'): string[] {
  const tags: string[] = [];
  if (type === 'FOOD') tags.push('飲食');
  if (type === 'STAGE') tags.push('音楽');
  if (location === 'INDOOR') tags.push('屋内');
  if (location === 'OUTDOOR') tags.push('屋外');
  return tags;
}

function getFileUrl(baseUrl: string, fileId: string | null | undefined): string | undefined {
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
    thumbnail: iconUrl || '/sample/dog.jpg',
    cancelled: project.publicInfo.openStatus === 'CLOSED',
  };
}

function mapToShopDetail(project: SosPublicProject, baseUrl: string): ShopDetail {
  const images = (project.publicInfo.mapImageFileIds || [])
    .map(fileId => getFileUrl(baseUrl, fileId))
    .filter((url): url is string => !!url);

  return {
    ...mapToShop(project, baseUrl),
    description: project.publicInfo.description || '詳細説明はありません。',
    images: images.length > 0 ? images : ['/sample/dog.jpg'],
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
  },
];

function toFallbackShop(detail: ShopDetail): Shop {
  const { description: _description, images: _images, ...shop } = detail;
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

// HTTPクライアント
export class SosClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.SOS_API_URL || '';
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
    };
  }

  /**
   * SOS API から企画一覧を取得し、Shop配列にマッピングして返却します。
   */
  async getShops(): Promise<Shop[]> {
    if (!this.baseUrl) {
      console.warn('SOS_API_URL is not defined. Falling back to dummy shop data.');
      return fallbackShopDetails.map(toFallbackShop);
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
      return parsed.map((project) => mapToShop(project, this.baseUrl));
    } catch (error) {
      console.warn('Failed to fetch SOS projects. Falling back to dummy shop data.', error);
      return fallbackShopDetails.map(toFallbackShop);
    }
  }

  /**
   * SOS API から特定の企画詳細を取得し、ShopDetailにマッピングして返却します。
   */
  async getShopDetail(id: string): Promise<ShopDetail> {
    if (!this.baseUrl) {
      console.warn('SOS_API_URL is not defined. Falling back to dummy shop detail.');
      const fallbackDetail = fallbackShopDetails.find((shop) => shop.id === id);
      if (!fallbackDetail) {
        throw new SosClientError('UPSTREAM', `SOS API is unavailable and fallback data has no shop: ${id}`);
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
        throw new SosClientError('UPSTREAM', `Failed to fetch project detail for ${id}: ${response.statusText}`);
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
        console.warn(`Failed to fetch SOS project detail for ${id}. Falling back to dummy data.`, error);
        return fallbackDetail;
      }

      throw new SosClientError('UPSTREAM', `Failed to fetch project detail for ${id}`);
    }
  }
}

export const sosClient = new SosClient();
