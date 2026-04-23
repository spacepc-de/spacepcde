import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE IF NOT EXISTS \`navigation_links\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` numeric DEFAULT 0 NOT NULL,
  	\`open_in_new_tab\` numeric DEFAULT false,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );`)
  await db.run(
    sql`CREATE TABLE IF NOT EXISTS \`navigation_links_locales\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`label\` text NOT NULL,
  	\`href\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`navigation_links\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );`,
  )
  await db.run(
    sql`CREATE INDEX IF NOT EXISTS \`navigation_links_order_idx\` ON \`navigation_links\` (\`order\`);`,
  )
  await db.run(
    sql`CREATE INDEX IF NOT EXISTS \`navigation_links_updated_at_idx\` ON \`navigation_links\` (\`updated_at\`);`,
  )
  await db.run(
    sql`CREATE INDEX IF NOT EXISTS \`navigation_links_created_at_idx\` ON \`navigation_links\` (\`created_at\`);`,
  )
  await db.run(
    sql`CREATE INDEX IF NOT EXISTS \`navigation_links_locales_locale_idx\` ON \`navigation_links_locales\` (\`_locale\`);`,
  )
  await db.run(
    sql`CREATE INDEX IF NOT EXISTS \`navigation_links_locales_parent_id_idx\` ON \`navigation_links_locales\` (\`_parent_id\`);`,
  )

  await db.run(sql`CREATE TABLE IF NOT EXISTS \`footer_links\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` numeric DEFAULT 0 NOT NULL,
  	\`open_in_new_tab\` numeric DEFAULT false,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );`)
  await db.run(
    sql`CREATE TABLE IF NOT EXISTS \`footer_links_locales\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`label\` text NOT NULL,
  	\`href\` text NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`footer_links\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );`,
  )
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`footer_links_order_idx\` ON \`footer_links\` (\`order\`);`)
  await db.run(
    sql`CREATE INDEX IF NOT EXISTS \`footer_links_updated_at_idx\` ON \`footer_links\` (\`updated_at\`);`,
  )
  await db.run(
    sql`CREATE INDEX IF NOT EXISTS \`footer_links_created_at_idx\` ON \`footer_links\` (\`created_at\`);`,
  )
  await db.run(
    sql`CREATE INDEX IF NOT EXISTS \`footer_links_locales_locale_idx\` ON \`footer_links_locales\` (\`_locale\`);`,
  )
  await db.run(
    sql`CREATE INDEX IF NOT EXISTS \`footer_links_locales_parent_id_idx\` ON \`footer_links_locales\` (\`_parent_id\`);`,
  )
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`footer_links_locales\`;`)
  await db.run(sql`DROP TABLE \`footer_links\`;`)
  await db.run(sql`DROP TABLE \`navigation_links_locales\`;`)
  await db.run(sql`DROP TABLE \`navigation_links\`;`)
}
