import { z } from 'zod';
import extraProjectsJson from '../data/extra-projects.json';
import projectLocationsJson from '../data/project-locations.json';
import stageProjectsJson from '../data/stage-projects.json';
import stageTimetableJson from '../data/stage-timetable.json';
import {
  type Performance,
  PROJECT_CATEGORIES,
  type ProjectLocation,
  SCHEDULE_DAYS,
} from '../domain/project';

// リポジトリに置いた企画データ（apps/api/data/*.json）。起動時に形を検証し、壊れていれば起動しない。

const locationSchema = z.object({
  placeId: z.string(),
  room: z.string().optional(),
  days: z.array(z.enum(SCHEDULE_DAYS)),
});

const performanceSchema = z.object({
  placeId: z.string(),
  day: z.enum(SCHEDULE_DAYS),
  start: z.string(),
  end: z.string(),
  title: z.string(),
});

// 企画番号 → 実施場所。scripts/import-project-locations.ts で企画実施場所一覧から生成する。
export const PROJECT_LOCATIONS: Record<string, ProjectLocation[]> = z
  .record(z.string(), z.array(locationSchema))
  .parse(projectLocationsJson);

// 企画番号 → 実施ステージの placeId。scripts/import-stage-projects.ts で SOS から生成する。
export const STAGE_PROJECTS: Record<string, string> = z
  .record(z.string(), z.string())
  .parse(stageProjectsJson);

// 企画番号 → ステージの出演枠。apps/api の build（scripts/import-stage-timetable.ts）で公式サイトから生成する。
export const STAGE_TIMETABLE: Record<string, Performance[]> = z
  .record(z.string(), z.array(performanceSchema))
  .parse(stageTimetableJson);

/**
 * SOS に無い企画の番号。URL と並び順は3桁の番号の文字列で扱い、非表示の環境変数は数字しか受け付けないため、
 * SOS の番号と重ならない 900 番台に限る。
 */
export const EXTRA_PROJECT_NUMBER = /^9\d\d$/;

const extraProjectSchema = z.strictObject({
  name: z.string().min(1),
  organization: z.string().min(1),
  category: z.enum(PROJECT_CATEGORIES),
  locations: z.array(locationSchema).min(1),
  tags: z.array(z.string()).default([]),
  description: z.string().default(''),
  thumbnail: z.string().optional(),
  images: z.array(z.string()).default([]),
  links: z.array(z.string()).default([]),
  performances: z.array(performanceSchema).optional(),
  cancelled: z.boolean().default(false),
});

export type ExtraProject = z.infer<typeof extraProjectSchema>;

// 企画番号 → SOS に無い企画。書き方は docs/data/extra-projects.md。
export const EXTRA_PROJECTS: Record<string, ExtraProject> = z
  .record(z.string().regex(EXTRA_PROJECT_NUMBER), extraProjectSchema)
  .parse(extraProjectsJson);
