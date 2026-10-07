import { relations } from 'drizzle-orm';
import {
  boolean,
  foreignKey,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  timestamp,
  varchar,
} from 'drizzle-orm/mysql-core';

// ---- users / sessions（LINEログイン） ----

export const users = mysqlTable('users', {
  id: varchar('id', { length: 36 }).primaryKey(),
  lineUserId: varchar('line_user_id', { length: 64 }).notNull().unique(),
  displayName: varchar('display_name', { length: 255 }),
  isTsukubaStudent: boolean('is_tsukuba_student'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const sessions = mysqlTable('sessions', {
  // cookieの生トークンではなく、そのSHA-256ハッシュを保存する。
  id: varchar('id', { length: 64 }).primaryKey(),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .references(() => users.id),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ---- 雙峰祭グランプリ投票 ----

// Place側の生IDに依存させず、投票用に統合したステージの識別子。
// 'kaikan' は「大学会館ステージ（講堂）」「大学会館ステージ（ホール）」の両方をまとめた1票として扱う。
export const grandprixStages = ['1a', 'united', 'kaikan'] as const;
export type GrandprixStage = (typeof grandprixStages)[number];

export const grandprixVotes = mysqlTable('grandprix_votes', {
  id: varchar('id', { length: 36 }).primaryKey(),
  // UNIQUE制約で「1人1回」をDB層で強制する。
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .unique()
    .references(() => users.id),
  submittedAt: timestamp('submitted_at').notNull().defaultNow(),
});

// 一般部門の投票先（Shop.id）。複合PKで同一企画への重複投票をDB層で防止する。
export const grandprixGeneralVotes = mysqlTable(
  'grandprix_general_votes',
  {
    voteId: varchar('vote_id', { length: 36 })
      .notNull()
      .references(() => grandprixVotes.id),
    // apps/api の Shop はDB化されていないため、外部キー制約は持たせない。
    shopId: varchar('shop_id', { length: 64 }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.voteId, table.shopId] })],
);

// ステージ部門の投票先。1〜3ステージまで独立して選択でき、重複投票不可。
export const grandprixStageVotes = mysqlTable(
  'grandprix_stage_votes',
  {
    voteId: varchar('vote_id', { length: 36 })
      .notNull()
      .references(() => grandprixVotes.id),
    stage: mysqlEnum('stage', grandprixStages).notNull(),
  },
  (table) => [primaryKey({ columns: [table.voteId, table.stage] })],
);

export const grandprixDraws = mysqlTable('grandprix_draws', {
  id: varchar('id', { length: 36 }).primaryKey(),
  voteId: varchar('vote_id', { length: 36 })
    .notNull()
    .unique()
    .references(() => grandprixVotes.id),
  result: mysqlEnum('result', ['win', 'lose']).notNull(),
  drawnAt: timestamp('drawn_at').notNull().defaultNow(),
});

// ---- 来場者アンケート・福引券 ----

export const questionnaireSubmissions = mysqlTable(
  'questionnaire_submissions',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    // 回答ごとに福引券が発行されるため、UNIQUE制約で「1人1回」をDB層で強制する。
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .unique()
      .references(() => users.id),
    headcount: int('headcount').notNull(),
    submittedAt: timestamp('submitted_at').notNull().defaultNow(),
  },
);

// MySQLの識別子は64文字までのため、自動生成される制約名が長くなりすぎる
// 参照は foreignKey() で明示的に短い名前を付ける。
export const questionnaireResponses = mysqlTable(
  'questionnaire_responses',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    submissionId: varchar('submission_id', { length: 36 }).notNull(),
    personIndex: int('person_index').notNull(),
    // 質問内容が未確定のため、汎用的なJSONで保持する。
    answers: json('answers').notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.submissionId],
      foreignColumns: [questionnaireSubmissions.id],
      name: 'questionnaire_responses_submission_id_fk',
    }),
  ],
);

export const questionnaireTickets = mysqlTable(
  'questionnaire_tickets',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    responseId: varchar('response_id', { length: 36 }).notNull().unique(),
    status: mysqlEnum('status', ['unused', 'used']).notNull().default('unused'),
    usedAt: timestamp('used_at'),
  },
  (table) => [
    foreignKey({
      columns: [table.responseId],
      foreignColumns: [questionnaireResponses.id],
      name: 'questionnaire_tickets_response_id_fk',
    }),
  ],
);

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
