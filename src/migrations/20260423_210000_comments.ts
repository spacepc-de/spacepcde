import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE IF NOT EXISTS \`comments\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`post_id\` integer NOT NULL,
  	\`author_name\` text NOT NULL,
  	\`author_email\` text NOT NULL,
  	\`content\` text NOT NULL,
  	\`approved\` numeric DEFAULT false,
  	\`approved_at\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`post_id\`) REFERENCES \`blog_posts\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`comments_post_idx\` ON \`comments\` (\`post_id\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`comments_approved_idx\` ON \`comments\` (\`approved\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`comments_approved_at_idx\` ON \`comments\` (\`approved_at\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`comments_updated_at_idx\` ON \`comments\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`comments_created_at_idx\` ON \`comments\` (\`created_at\`);`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`comments\`;`)
}
