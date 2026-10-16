import projectsJson from '../data/projects.json';
import {
  formatProjectNumber,
  type Project,
  type ProjectDetail,
  type ProjectImage,
  type ProjectMaster,
} from '../domain/project';
import { type SosDynamicProject, SosDynamicProjectSchema } from './sos-schema';

// 企画のマスターデータ。scripts/build-projects.ts が型を保って生成するため、ここでは検証しない。
// 掲載する企画はこれで決まり、実行時に SOS から取るのは画像と公開状態だけ。
const PROJECT_MASTERS = projectsJson as ProjectMaster[];

// SOS の画像 API が縮小を受け付ける幅（px）。
const IMAGE_WIDTHS = [160, 320, 640, 1280] as const;

function toProjectImage(baseUrl: string, fileId: string): ProjectImage {
  const url = `${baseUrl}/openapi/images/${fileId}`;
  return {
    src: `${url}?width=640`,
    srcSet: IMAGE_WIDTHS.map((w) => `${url}?width=${w} ${w}w`).join(', '),
  };
}

type DynamicInfo = SosDynamicProject['publicInfo'];

function withDynamicInfo(
  master: ProjectMaster,
  info: DynamicInfo | undefined,
  baseUrl: string,
): ProjectDetail {
  const toImage = (fileId: string) => toProjectImage(baseUrl, fileId);
  return {
    ...master,
    thumbnail: info?.iconFileId ? toImage(info.iconFileId) : master.thumbnail,
    images: info?.mapImageFileIds?.map(toImage) ?? master.images ?? [],
    cancelled: info?.openStatus === 'CLOSED',
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

// 画像・公開状態をこの期間キャッシュする。project.list・grandprix.* から
// 呼ばれるため、毎回外部APIを叩かないようにする。
const DYNAMIC_INFO_CACHE_TTL_MS = 30_000;

export class SosClient {
  private baseUrl: string;
  private hiddenNumbers: ReadonlySet<string>;
  private cache: { details: ProjectDetail[]; expiresAt: number } | null = null;

  constructor(baseUrl: string, hiddenNumbers: ReadonlySet<string>) {
    this.baseUrl = baseUrl;
    this.hiddenNumbers = hiddenNumbers;
  }

  async getProjects(): Promise<Project[]> {
    return (await this.getProjectDetails()).map(toProject);
  }

  /** 画面に出す企画を、詳細情報まで含めて返す。 */
  async getProjectDetails(): Promise<ProjectDetail[]> {
    // キャッシュには全件を残し、非表示の企画の除外は読み出しごとに行う。
    return (await this.getAllDetails()).filter(
      ({ number }) => !this.hiddenNumbers.has(number),
    );
  }

  private async getAllDetails(): Promise<ProjectDetail[]> {
    if (this.cache && this.cache.expiresAt > Date.now()) {
      return this.cache.details;
    }

    const infos = await this.fetchDynamicInfos();
    const details = PROJECT_MASTERS.map((master) =>
      withDynamicInfo(master, infos.get(master.number), this.baseUrl),
    );
    this.cache = { details, expiresAt: Date.now() + DYNAMIC_INFO_CACHE_TTL_MS };
    return details;
  }

  // 公開APIには企画番号で引くエンドポイントも画像・状態だけを返すエンドポイントもないため、
  // 一覧を取って必要な項目だけを使う。取れなければ画像・公開状態なしで企画を出す。
  private async fetchDynamicInfos(): Promise<ReadonlyMap<string, DynamicInfo>> {
    if (!this.baseUrl) {
      console.warn(
        'SOS_API_URL is not defined. Serving projects without images.',
      );
      return new Map();
    }

    try {
      const response = await fetch(`${this.baseUrl}/openapi/projects`, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.statusText}`);
      }

      const projects = SosDynamicProjectSchema.array().parse(
        await response.json(),
      );
      return new Map(
        projects.map(({ number, publicInfo }) => [
          formatProjectNumber(number),
          publicInfo,
        ]),
      );
    } catch (error) {
      console.warn(
        'Failed to fetch SOS projects. Serving projects without images.',
        error,
      );
      return new Map();
    }
  }
}

/**
 * カンマ区切りの企画番号を、3 桁ゼロ埋めの番号の集合にする。空要素は無視する。
 * 環境変数 HIDDEN_PROJECT_NUMBERS / GRANDPRIX_HIDDEN_PROJECT_NUMBERS の値に使う。
 */
export function parseProjectNumbers(raw = ''): ReadonlySet<string> {
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
  hiddenNumbers?: string,
): SosClient {
  const key = `${baseUrl} ${hiddenNumbers}`;
  let client = clients.get(key);
  if (!client) {
    client = new SosClient(baseUrl, parseProjectNumbers(hiddenNumbers));
    clients.set(key, client);
  }
  return client;
}
