import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE IF NOT EXISTS \`redirects\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`from_path\` text NOT NULL,
  	\`to_path\` text NOT NULL,
  	\`status_code\` text DEFAULT '301' NOT NULL,
  	\`is_enabled\` numeric DEFAULT true,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );`)
  await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS \`redirects_from_path_idx\` ON \`redirects\` (\`from_path\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`redirects_status_code_idx\` ON \`redirects\` (\`status_code\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`redirects_is_enabled_idx\` ON \`redirects\` (\`is_enabled\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`redirects_updated_at_idx\` ON \`redirects\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`redirects_created_at_idx\` ON \`redirects\` (\`created_at\`);`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`redirects\`;`)
}
