import { z } from 'zod';

/**
 * SOS 公開 API の企画のうち、ビルド時に取り込んで企画のマスターデータに固定する項目。
 * scripts/sync-projects.ts はこのスキーマに通して余計な項目を落とし、apps/api/data/sources/sos-projects.json に書き出す。
 */
export const SosStaticProjectSchema = z.object({
  id: z.string(),
  number: z.number().int(),
  name: z.string(),
  namePhonetic: z.string().optional(),
  organizationName: z.string(),
  organizationNamePhonetic: z.string().optional(),
  type: z.enum(['STAGE', 'FOOD', 'NORMAL']),
  location: z.enum(['INDOOR', 'OUTDOOR', 'STAGE']),
  publicInfo: z.object({
    description: z.string().nullable().optional(),
    websiteUrls: z.array(z.string()).optional(),
    xIds: z.array(z.string()).optional(),
    instagramIds: z.array(z.string()).optional(),
    youtubeIds: z.array(z.string()).optional(),
  }),
});

/** 当日に変わりうるため、実行時に SOS から取り直す項目。 */
export const SosDynamicProjectSchema = z.object({
  number: z.number().int(),
  publicInfo: z.object({
    iconFileId: z.string().nullable().optional(),
    mapImageFileIds: z.array(z.string()).optional(),
    openStatus: z.enum(['OPEN', 'CLOSED', 'NOT_APPLICABLE']),
  }),
});

export type SosStaticProject = z.infer<typeof SosStaticProjectSchema>;
export type SosDynamicProject = z.infer<typeof SosDynamicProjectSchema>;
