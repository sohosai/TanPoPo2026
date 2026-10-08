import { z } from 'zod';
import projectLocationsJson from '../data/project-locations.json';
import stageProjectsJson from '../data/stage-projects.json';
import type {
  ScheduleDay,
  Project,
  ProjectCategory,
  ProjectDetail,
  ProjectImage,
  ProjectLink,
  ProjectLocation,
} from '../domain/project';
import { fallbackProjectDetails } from './sos-fallback';

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
});

const SosPublicProjectListSchema = z.array(SosPublicProjectSchema);

type SosPublicProject = z.infer<typeof SosPublicProjectSchema>;

const CATEGORY_BY_TYPE: Record<SosPublicProject['type'], ProjectCategory> = {
  FOOD: '食品',
  STAGE: 'ステージ',
  NORMAL: 'その他',
};

const SCHEDULE_DAYS = [
  '前夜祭',
  'Day1',
  'Day2',
] as const satisfies ScheduleDay[];

// 企画番号 → 実施場所。scripts/import-project-locations.ts で企画実施場所一覧から生成する。
const PROJECT_LOCATIONS: Record<string, ProjectLocation[]> = z
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
  .parse(projectLocationsJson);

// 企画番号 → 実施ステージの placeId。scripts/import-stage-projects.ts で SOS から生成する。
const STAGE_PROJECTS: Record<string, string> = z
  .record(z.string(), z.string())
  .parse(stageProjectsJson);

/** 企画の実施場所を返す。分からない企画は空配列（表示上は「未定」）。 */
function mapLocations(project: SosPublicProject): ProjectLocation[] {
  const listed = PROJECT_LOCATIONS[project.number];
  if (listed) return listed;
  const stage = STAGE_PROJECTS[project.number];
  return stage ? [{ placeId: stage }] : [];
}

/** 実施場所ごとの実施日を合わせた、企画全体の実施日。日付の分からない企画は本祭2日間とする。 */
function scheduleOf(locations: ProjectLocation[]): ScheduleDay[] {
  const days = new Set(locations.flatMap((location) => location.days ?? []));
  return days.size > 0
    ? SCHEDULE_DAYS.filter((day) => days.has(day))
    : ['Day1', 'Day2'];
}

function mapTags(
  type: SosPublicProject['type'],
  location: SosPublicProject['location'],
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

function toProjectImage(baseUrl: string, fileId: string): ProjectImage {
  const url = `${baseUrl}/openapi/images/${fileId}`;
  return {
    src: `${url}?width=640`,
    srcSet: IMAGE_WIDTHS.map((w) => `${url}?width=${w} ${w}w`).join(', '),
  };
}

// URL に使うため、桁数をそろえて辞書順と番号順を一致させる。
function formatProjectNumber(number: number): string {
  return String(number).padStart(3, '0');
}

function mapToProject(project: SosPublicProject, baseUrl: string): Project {
  const { iconFileId } = project.publicInfo;
  const locations = mapLocations(project);
  return {
    id: project.id,
    number: formatProjectNumber(project.number),
    name: project.name,
    organization: project.organizationName,
    locations,
    schedule: scheduleOf(locations),
    category: CATEGORY_BY_TYPE[project.type],
    tags: mapTags(project.type, project.location),
    thumbnail: iconFileId ? toProjectImage(baseUrl, iconFileId) : undefined,
    cancelled: project.publicInfo.openStatus === 'CLOSED',
  };
}

const HANDLE_PATTERN = /^[\w.-]+$/;

const xLink = (id: string): ProjectLink => ({
  kind: 'x',
  label: `@${id}`,
  url: `https://x.com/${id}`,
});

const instagramLink = (id: string): ProjectLink => ({
  kind: 'instagram',
  label: `@${id}`,
  url: `https://www.instagram.com/${id}/`,
});

// YouTube はハンドル（例: folktkb）とチャンネル名（例: 「〇〇班げんしけん」）が混在して
// 登録されている。チャンネル名からはチャンネル URL を作れないため検索結果へ飛ばす。
function youtubeLink(id: string): ProjectLink {
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
function linkFromUrl(raw: string): ProjectLink | null {
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
  fromHandle: (id: string) => ProjectLink,
): ProjectLink | null {
  const value = raw.trim();
  if (value === '') return null;
  if (/^https?:\/\//.test(value)) return linkFromUrl(value);
  return fromHandle(value.replace(/^@/, ''));
}

function mapLinks(info: SosPublicProject['publicInfo']): ProjectLink[] {
  const links = [
    ...(info.websiteUrls ?? []).map((url) => linkFromUrl(url.trim())),
    ...(info.xIds ?? []).map((id) => linkFromId(id, xLink)),
    ...(info.instagramIds ?? []).map((id) => linkFromId(id, instagramLink)),
    ...(info.youtubeIds ?? []).map((id) => linkFromId(id, youtubeLink)),
  ].filter((link): link is ProjectLink => link !== null);

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

const LINK_ORDER: ProjectLink['kind'][] = [
  'website',
  'x',
  'instagram',
  'youtube',
];

function mapToProjectDetail(
  project: SosPublicProject,
  baseUrl: string,
): ProjectDetail {
  const images = (project.publicInfo.mapImageFileIds ?? []).map((fileId) =>
    toProjectImage(baseUrl, fileId),
  );

  return {
    ...mapToProject(project, baseUrl),
    description: project.publicInfo.description || '詳細説明はありません。',
    images,
    links: mapLinks(project.publicInfo),
  };
}

function toProject(detail: ProjectDetail): Project {
  const {
    description: _description,
    images: _images,
    links: _links,
    ...project
  } = detail;
  return project;
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
// project.list・project.detail・grandprix.submit（投票時のID検証）から
// 呼ばれるため、毎回外部APIを叩かないようにする。
const PROJECTS_CACHE_TTL_MS = 30_000;

type ProjectDetails = { details: ProjectDetail[]; isFallback: boolean };

// HTTPクライアント
export class SosClient {
  private baseUrl: string;
  private hiddenNumbers: ReadonlySet<string>;
  private cache: (ProjectDetails & { expiresAt: number }) | null = null;

  constructor(baseUrl: string, hiddenNumbers: ReadonlySet<string>) {
    this.baseUrl = baseUrl;
    this.hiddenNumbers = hiddenNumbers;
  }

  /**
   * SOS API から企画一覧を取得し、Project配列にマッピングして返却します。
   * 短時間キャッシュするため、連続した呼び出しは外部APIを叩きません。
   */
  async getProjects(): Promise<Project[]> {
    return (await this.getCachedDetails()).details.map(toProject);
  }

  /**
   * SOS API から実際に取得できた企画一覧だけを返す。取得に失敗してダミーデータに
   * フォールバックした場合は投票の検証に使えないため、例外を投げる。
   */
  async getLiveProjects(): Promise<Project[]> {
    const { details, isFallback } = await this.getCachedDetails();
    if (isFallback) {
      throw new SosClientError(
        'UPSTREAM',
        'SOS API から企画一覧を取得できません',
      );
    }
    return details.map(toProject);
  }

  /**
   * 3桁ゼロ埋めの企画番号（例: "001"）から企画詳細を返す。
   */
  async getProjectDetail(number: string): Promise<ProjectDetail> {
    const { details, isFallback } = await this.getCachedDetails();
    const detail = details.find((project) => project.number === number);
    if (detail) return detail;
    if (isFallback) {
      throw new SosClientError(
        'UPSTREAM',
        `SOS API is unavailable and fallback data has no project: ${number}`,
      );
    }
    throw new SosClientError('NOT_FOUND', `店舗が見つかりません: ${number}`);
  }

  // 非表示の企画は取得結果から除く。キャッシュには全件を残し、除外は読み出しごとに行う。
  private async getCachedDetails(): Promise<ProjectDetails> {
    const { details, isFallback } = await this.getAllDetails();
    return {
      details: details.filter(({ number }) => !this.hiddenNumbers.has(number)),
      isFallback,
    };
  }

  private async getAllDetails(): Promise<ProjectDetails> {
    if (this.cache && this.cache.expiresAt > Date.now()) {
      return this.cache;
    }

    const details = await this.fetchDetails();
    this.cache = { ...details, expiresAt: Date.now() + PROJECTS_CACHE_TTL_MS };
    return details;
  }

  // 公開APIの一覧は詳細と同じ項目を返し、企画番号で引くエンドポイントもないため、
  // 詳細も一覧から作る。
  private async fetchDetails(): Promise<ProjectDetails> {
    const fallback = { details: fallbackProjectDetails, isFallback: true };

    if (!this.baseUrl) {
      console.warn(
        'SOS_API_URL is not defined. Falling back to dummy project data.',
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
          mapToProjectDetail(project, this.baseUrl),
        ),
        isFallback: false,
      };
    } catch (error) {
      console.warn(
        'Failed to fetch SOS projects. Falling back to dummy project data.',
        error,
      );
      return fallback;
    }
  }
}

/**
 * カンマ区切りの企画番号を、3 桁ゼロ埋めの番号の集合にする。空要素は無視する。
 * 環境変数 HIDDEN_PROJECT_NUMBERS / GRANDPRIX_HIDDEN_PROJECT_NUMBERS の値に使う。
 */
export function parseProjectNumbers(raw: string): ReadonlySet<string> {
  return new Set(
    raw
      .split(',')
      .map((value) => value.trim())
      .filter((value) => /^\d+$/.test(value))
      .map((value) => formatProjectNumber(Number(value))),
  );
}

// Workers ではリクエストごとに env が渡されるが、企画一覧のキャッシュは
// isolate が生きている間リクエストをまたいで使い回したいので、インスタンスを保持する。
const clients = new Map<string, SosClient>();

export function getSosClient(
  baseUrl: string,
  hiddenNumbers: string,
): SosClient {
  const key = `${baseUrl} ${hiddenNumbers}`;
  let client = clients.get(key);
  if (!client) {
    client = new SosClient(baseUrl, parseProjectNumbers(hiddenNumbers));
    clients.set(key, client);
  }
  return client;
}
