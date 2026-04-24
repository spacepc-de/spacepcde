import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`blog_posts\` ADD COLUMN \`featured\` numeric DEFAULT false;`)
  await db.run(sql`UPDATE \`blog_posts\` SET \`featured\` = COALESCE(\`featured\`, false);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`blog_posts_featured_idx\` ON \`blog_posts\` (\`featured\`);`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX IF EXISTS \`blog_posts_featured_idx\`;`)
}
