import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE IF NOT EXISTS \`pages\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`is_legal_page\` numeric DEFAULT false,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );`)
  await db.run(sql`CREATE TABLE IF NOT EXISTS \`pages_locales\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text NOT NULL,
  	\`url\` text NOT NULL,
  	\`content\` text NOT NULL,
  	\`content_markdown\` text,
  	\`seo_title\` text,
  	\`seo_description\` text,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`pages_updated_at_idx\` ON \`pages\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`pages_created_at_idx\` ON \`pages\` (\`created_at\`);`)
  await db.run(
    sql`CREATE INDEX IF NOT EXISTS \`pages_is_legal_page_idx\` ON \`pages\` (\`is_legal_page\`);`,
  )
  await db.run(
    sql`CREATE INDEX IF NOT EXISTS \`pages_locales_locale_idx\` ON \`pages_locales\` (\`_locale\`);`,
  )
  await db.run(
    sql`CREATE INDEX IF NOT EXISTS \`pages_locales_parent_id_idx\` ON \`pages_locales\` (\`_parent_id\`);`,
  )
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`pages_locales\`;`)
  await db.run(sql`DROP TABLE \`pages\`;`)
}
