import { pgTable, text, jsonb, timestamp, uuid, index } from 'drizzle-orm/pg-core';

export const profiles = pgTable('apex_profiles', {
  owner: text().primaryKey(),
  name: text().notNull().default(''),
  shield: text().notNull().default('on'),
});
export const sessions = pgTable('apex_sessions', {
  id: uuid().primaryKey(),
  owner: text().notNull(),
  kind: text().notNull(),
  day: text().notNull(),
  result: jsonb().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index('apex_sessions_owner_date').on(table.owner, table.createdAt)]);
