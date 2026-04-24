import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`blog_posts\` ADD COLUMN \`status\` text DEFAULT 'draft' NOT NULL;`)
  await db.run(sql`UPDATE \`blog_posts\` SET \`status\` = COALESCE(\`_status\`, 'draft');`)
  await db.run(sql`UPDATE \`blog_posts\` SET \`status\` = 'published' WHERE \`published_at\` IS NOT NULL AND \`status\` = 'draft';`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`blog_posts_status_field_idx\` ON \`blog_posts\` (\`status\`);`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX IF EXISTS \`blog_posts_status_field_idx\`;`)
}
