import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE IF NOT EXISTS \`navigation_links_children\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`open_in_new_tab\` numeric DEFAULT false,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`navigation_links\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );`)
  await db.run(
    sql`CREATE TABLE IF NOT EXISTS \`navigation_links_children_locales\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`label\` text NOT NULL,
  	\`href\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`navigation_links_children\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );`,
  )
  await db.run(
    sql`CREATE INDEX IF NOT EXISTS \`navigation_links_children_order_idx\` ON \`navigation_links_children\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX IF NOT EXISTS \`navigation_links_children_parent_id_idx\` ON \`navigation_links_children\` (\`_parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX IF NOT EXISTS \`navigation_links_children_locales_locale_idx\` ON \`navigation_links_children_locales\` (\`_locale\`);`,
  )
  await db.run(
    sql`CREATE INDEX IF NOT EXISTS \`navigation_links_children_locales_parent_id_idx\` ON \`navigation_links_children_locales\` (\`_parent_id\`);`,
  )
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`navigation_links_children_locales\`;`)
  await db.run(sql`DROP TABLE \`navigation_links_children\`;`)
}
