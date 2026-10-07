import { relations, sql } from 'drizzle-orm';
import {
  integer,
  primaryKey,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';

// ---- users / sessions（LINEログイン） ----

// D1(SQLite)に日時型は無いため、UNIX秒の整数として保存する。
const createdAt = (name: string) =>
  integer(name, { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`);

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  lineUserId: text('line_user_id').notNull().unique(),
  displayName: text('display_name'),
  isTsukubaStudent: integer('is_tsukuba_student', { mode: 'boolean' }),
  createdAt: createdAt('created_at'),
});

export const sessions = sqliteTable('sessions', {
  // cookieの生トークンではなく、そのSHA-256ハッシュを保存する。
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: createdAt('created_at'),
});

// ---- 雙峰祭グランプリ投票 ----

// Place側の生IDに依存させず、投票用に統合したステージの識別子。
// 'kaikan' は「大学会館ステージ（講堂）」「大学会館ステージ（ホール）」の両方をまとめた1票として扱う。
export const grandprixStages = ['1a', 'united', 'kaikan'] as const;
export type GrandprixStage = (typeof grandprixStages)[number];

export const grandprixVotes = sqliteTable('grandprix_votes', {
  id: text('id').primaryKey(),
  // UNIQUE制約で「1人1回」をDB層で強制する。
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => users.id),
  submittedAt: createdAt('submitted_at'),
});

// 一般部門の投票先（Shop.id）。複合PKで同一企画への重複投票をDB層で防止する。
export const grandprixGeneralVotes = sqliteTable(
  'grandprix_general_votes',
  {
    voteId: text('vote_id')
      .notNull()
      .references(() => grandprixVotes.id),
    // apps/api の Shop はDB化されていないため、外部キー制約は持たせない。
    shopId: text('shop_id').notNull(),
  },
  (table) => [primaryKey({ columns: [table.voteId, table.shopId] })],
);

// ステージ部門の投票先。1〜3ステージまで独立して選択でき、重複投票不可。
export const grandprixStageVotes = sqliteTable(
  'grandprix_stage_votes',
  {
    voteId: text('vote_id')
      .notNull()
      .references(() => grandprixVotes.id),
    stage: text('stage', { enum: grandprixStages }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.voteId, table.stage] })],
);

export const grandprixDraws = sqliteTable('grandprix_draws', {
  id: text('id').primaryKey(),
  voteId: text('vote_id')
    .notNull()
    .unique()
    .references(() => grandprixVotes.id),
  result: text('result', { enum: ['win', 'lose'] }).notNull(),
  drawnAt: createdAt('drawn_at'),
});

// ---- 来場者アンケート・福引券 ----

export const questionnaireSubmissions = sqliteTable(
  'questionnaire_submissions',
  {
    id: text('id').primaryKey(),
    // 回答ごとに福引券が発行されるため、UNIQUE制約で「1人1回」をDB層で強制する。
    userId: text('user_id')
      .notNull()
      .unique()
      .references(() => users.id),
    headcount: integer('headcount').notNull(),
    submittedAt: createdAt('submitted_at'),
  },
);

export const questionnaireResponses = sqliteTable('questionnaire_responses', {
  id: text('id').primaryKey(),
  submissionId: text('submission_id')
    .notNull()
    .references(() => questionnaireSubmissions.id),
  personIndex: integer('person_index').notNull(),
  // 質問内容が未確定のため、汎用的なJSONで保持する。
  answers: text('answers', { mode: 'json' })
    .$type<Record<string, unknown>>()
    .notNull(),
});

export const questionnaireTickets = sqliteTable('questionnaire_tickets', {
  id: text('id').primaryKey(),
  responseId: text('response_id')
    .notNull()
    .unique()
    .references(() => questionnaireResponses.id),
  status: text('status', { enum: ['unused', 'used'] })
    .notNull()
    .default('unused'),
  usedAt: integer('used_at', { mode: 'timestamp' }),
});

// ---- リレーション定義（クエリビルダーでのjoinを簡潔にするため） ----

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  grandprixVote: many(grandprixVotes),
  questionnaireSubmissions: many(questionnaireSubmissions),
}));

export const grandprixVotesRelations = relations(
  grandprixVotes,
  ({ one, many }) => ({
    user: one(users, {
      fields: [grandprixVotes.userId],
      references: [users.id],
    }),
    generalVotes: many(grandprixGeneralVotes),
    stageVotes: many(grandprixStageVotes),
    draw: one(grandprixDraws, {
      fields: [grandprixVotes.id],
      references: [grandprixDraws.voteId],
    }),
  }),
);

export const questionnaireSubmissionsRelations = relations(
  questionnaireSubmissions,
  ({ one, many }) => ({
    user: one(users, {
      fields: [questionnaireSubmissions.userId],
      references: [users.id],
    }),
    responses: many(questionnaireResponses),
  }),
);

export const questionnaireResponsesRelations = relations(
  questionnaireResponses,
  ({ one }) => ({
    submission: one(questionnaireSubmissions, {
      fields: [questionnaireResponses.submissionId],
      references: [questionnaireSubmissions.id],
    }),
    ticket: one(questionnaireTickets, {
      fields: [questionnaireResponses.id],
      references: [questionnaireTickets.responseId],
    }),
  }),
);
