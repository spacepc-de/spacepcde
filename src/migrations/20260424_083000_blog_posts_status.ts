import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`blog_posts\` ADD COLUMN \`_status\` text DEFAULT 'draft' NOT NULL;`)
  await db.run(sql`UPDATE \`blog_posts\` SET \`_status\` = 'published' WHERE \`published_at\` IS NOT NULL;`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`blog_posts_status_idx\` ON \`blog_posts\` (\`_status\`);`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX IF EXISTS \`blog_posts_status_idx\`;`)
}
