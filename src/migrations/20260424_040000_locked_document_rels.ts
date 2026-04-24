import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-d1-sqlite'

const REL_COLUMNS = [
  'authors_id',
  'categories_id',
  'tags_id',
  'product_groups_id',
  'blog_posts_id',
  'pages_id',
  'redirects_id',
  'comments_id',
  'navigation_links_id',
  'footer_links_id',
] as const

async function addColumnIfMissing(db: MigrateUpArgs['db'], column: (typeof REL_COLUMNS)[number]) {
  try {
    await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD COLUMN \`${sql.raw(column)}\` integer;`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    if (message.includes('duplicate column name')) {
      return
    }

    throw error
  }
}

export async function up({ db }: MigrateUpArgs): Promise<void> {
  for (const column of REL_COLUMNS) {
    await addColumnIfMissing(db, column)
    await db.run(
      sql`CREATE INDEX IF NOT EXISTS \`${sql.raw(`payload_locked_documents_rels_${column}_idx`)}\` ON \`payload_locked_documents_rels\` (\`${sql.raw(column)}\`);`,
    )
  }
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // No-op: SQLite/D1 doesn't support dropping columns directly.
}
