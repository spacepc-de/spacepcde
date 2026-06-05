import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`product_groups\` ADD \`amazon_keyword\` text;`)
  await db.run(sql`ALTER TABLE \`product_groups\` ADD \`amazon_asins\` text;`)
  await db.run(sql`ALTER TABLE \`product_groups\` ADD \`amazon_product_limit\` numeric DEFAULT 4;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`product_groups\` DROP COLUMN \`amazon_product_limit\`;`)
  await db.run(sql`ALTER TABLE \`product_groups\` DROP COLUMN \`amazon_asins\`;`)
  await db.run(sql`ALTER TABLE \`product_groups\` DROP COLUMN \`amazon_keyword\`;`)
}
