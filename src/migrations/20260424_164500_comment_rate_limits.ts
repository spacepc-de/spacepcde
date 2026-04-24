import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE IF NOT EXISTS \`comment_rate_limits\` (
    \`key_hash\` text PRIMARY KEY NOT NULL,
    \`request_count\` integer NOT NULL DEFAULT 0,
    \`window_started_at\` integer NOT NULL,
    \`updated_at\` integer NOT NULL
  );`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`comment_rate_limits_updated_at_idx\` ON \`comment_rate_limits\` (\`updated_at\`);`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`comment_rate_limits\`;`)
}
