/**
 * apps/api/data/sources/ の元データを企画ごとにまとめ、企画のマスターデータ
 * （apps/api/data/projects.json）を生成する。API は実行時にこのマスターだけを読む。
 *
 * 元データは取得元ごとに分かれており、各 import スクリプトが書き出した後にこの処理を呼ぶ。
 * SOS に無い企画は manual-projects.json にマスターの形で手で書き、そのまま足す。
 *
 * 実行: bun run build:projects
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  formatProjectNumber,
  type Performance,
  type ProjectCategory,
  type ProjectLink,
  type ProjectLocation,
  type ProjectMaster,
  type ScheduleDay,
} from '../apps/api/domain/project';
import type { SosStaticProject } from '../apps/api/services/sos-schema';

const DATA_DIR = join(import.meta.dir, '..', 'apps/api/data');
const OUT_FILE = join(DATA_DIR, 'projects.json');

const SCHEDULE_DAYS: ScheduleDay[] = ['前夜祭', 'Day1', 'Day2'];

// 元データは各 import スクリプトが検証してから書き出すため、ここでは型を付けて読むだけにする。
// 同じプロセスで import スクリプトが書き換えた直後に呼ばれるため、静的 import ではなく都度読む。
function readSource<T>(name: string): T {
  return JSON.parse(readFileSync(join(DATA_DIR, 'sources', name), 'utf-8'));
}

type Sources = {
  categories: Record<string, ProjectCategory>;
  committee: ReadonlySet<number>;
  locations: Record<string, ProjectLocation[]>;
  stages: Record<string, string>;
  timetable: Record<string, Performance[]>;
};

/**
 * 企画の実施場所を返す。分からない企画は空配列（表示上は「未定」）。
 * タイムテーブルに載るステージは、出演する日を添えて実施場所に含める。
 */
function mapLocations(
  number: number,
  performances: Performance[],
  { locations, stages }: Sources,
): ProjectLocation[] {
  const stage = stages[number];
  const listed = locations[number] ?? (stage ? [{ placeId: stage }] : []);

  const stageDays = new Map<string, ScheduleDay[]>();
  for (const { placeId, day } of performances) {
    const days = stageDays.get(placeId) ?? [];
    if (!days.includes(day)) days.push(day);
    stageDays.set(placeId, days);
  }
  return [
    ...listed.filter(
      (location) => location.room || !stageDays.has(location.placeId),
    ),
    ...[...stageDays].map(([placeId, days]) => ({ placeId, days })),
  ];
}

/** 実施場所ごとの実施日を合わせた、企画全体の実施日。日付の分からない企画は本祭2日間とする。 */
function scheduleOf(locations: ProjectLocation[]): ScheduleDay[] {
  const days = new Set(locations.flatMap((location) => location.days ?? []));
  return days.size > 0
    ? SCHEDULE_DAYS.filter((day) => days.has(day))
    : ['Day1', 'Day2'];
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

const LINK_ORDER: ProjectLink['kind'][] = [
  'website',
  'x',
  'instagram',
  'youtube',
];

function mapLinks(info: SosStaticProject['publicInfo']): ProjectLink[] {
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

// 委員会企画は実行委員会の分類表に載らないため、手で管理する番号一覧で決める。
// 分類表にも一覧にも無い企画は、SOS の企画区分から決める。
function categoryOf(
  project: SosStaticProject,
  { categories, committee }: Sources,
): ProjectCategory {
  if (committee.has(project.number)) return '委員会企画';
  return (
    categories[project.number] ??
    (project.type === 'STAGE' ? 'パフォーマンス' : 'その他')
  );
}

// マスターを読む人のために、キーは識別子・分類・場所・詳細の順に並べる。
function toMaster(project: SosStaticProject, sources: Sources): ProjectMaster {
  const performances = sources.timetable[project.number] ?? [];
  const locations = mapLocations(project.number, performances, sources);
  return {
    number: formatProjectNumber(project.number),
    id: project.id,
    name: project.name,
    nameReading: project.namePhonetic?.trim() ?? '',
    organization: project.organizationName,
    organizationReading: project.organizationNamePhonetic?.trim() ?? '',
    category: categoryOf(project, sources),
    schedule: scheduleOf(locations),
    locations,
    performances,
    description: project.publicInfo.description?.trim() ?? '',
    links: mapLinks(project.publicInfo),
  };
}

export function buildProjects() {
  const sources: Sources = {
    categories: readSource('project-categories.json'),
    committee: new Set(readSource<number[]>('committee-projects.json')),
    // 配置図の企画一覧に載らない企画（実行委員会の企画など）の場所は、手で書いた元データで足す。
    locations: {
      ...readSource<Sources['locations']>('project-locations.json'),
      ...readSource<Sources['locations']>('manual-locations.json'),
    },
    stages: readSource('stage-projects.json'),
    timetable: readSource('stage-timetable.json'),
  };
  const fromSos = readSource<SosStaticProject[]>('sos-projects.json').map(
    (project) => toMaster(project, sources),
  );
  // SOS に無い企画（実行委員会の福引所など）は、マスターの形のまま手で書いた元データから足す。
  const manual = readSource<ProjectMaster[]>('manual-projects.json');
  const sosNumbers = new Set(fromSos.map(({ number }) => number));
  for (const { number, name } of manual) {
    if (sosNumbers.has(number)) {
      throw new Error(
        `manual-projects.json の ${number}（${name}）は SOS の企画番号と重なっています`,
      );
    }
  }
  const projects = [...fromSos, ...manual].sort((a, b) =>
    a.number.localeCompare(b.number),
  );
  writeFileSync(OUT_FILE, `${JSON.stringify(projects, null, 2)}\n`);
  // リポジトリの JSON は biome で整形しているため、生成後も同じ書式にそろえる（CI の format チェック対策）。
  Bun.spawnSync(['bunx', 'biome', 'format', '--write', OUT_FILE], {
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  console.log(`${projects.length} 企画のマスターを出力: ${OUT_FILE}`);
}

if (import.meta.main) buildProjects();
