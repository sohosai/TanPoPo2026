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
      return [{ placeId: 'bldg-2c', room: '101' }];
    case 'OUTDOOR':
    default:
      return [{ placeId: 'bldg-1a', room: '101' }];
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

// HTTPクライアント
export class SosClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.SOS_API_URL || '';
    if (!this.baseUrl) {
      throw new Error('SOS_API_URL environment variable is not defined.');
    }
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
    const response = await fetch(`${this.baseUrl}/openapi/projects`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }

    const json = await response.json();
    const parsed = SosPublicProjectListSchema.parse(json);
    return parsed.map((project) => mapToShop(project, this.baseUrl));
  }

  /**
   * SOS API から特定の企画詳細を取得し、ShopDetailにマッピングして返却します。
   */
  async getShopDetail(id: string): Promise<ShopDetail> {
    const response = await fetch(`${this.baseUrl}/openapi/projects/${id}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch project detail for ${id}: ${response.statusText}`);
    }

    const json = await response.json();
    const parsed = SosPublicProjectSchema.parse(json);
    return mapToShopDetail(parsed, this.baseUrl);
  }
}

export const sosClient = new SosClient();
