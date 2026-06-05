import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE IF NOT EXISTS \`amazon_product_cache\` (
    \`cache_key\` text PRIMARY KEY NOT NULL,
    \`operation\` text NOT NULL,
    \`payload\` text NOT NULL,
    \`expires_at\` integer NOT NULL,
    \`created_at\` integer NOT NULL,
    \`updated_at\` integer NOT NULL
  );`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`amazon_product_cache_expires_at_idx\` ON \`amazon_product_cache\` (\`expires_at\`);`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`amazon_product_cache\`;`)
}
