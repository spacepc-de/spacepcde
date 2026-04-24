import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-d1-sqlite'

const LOCALE_COLUMNS = ['seo_title', 'seo_description'] as const

async function addColumnIfMissing(db: MigrateUpArgs['db'], column: (typeof LOCALE_COLUMNS)[number]) {
  try {
    await db.run(sql`ALTER TABLE \`blog_posts_locales\` ADD COLUMN \`${sql.raw(column)}\` text;`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    if (message.includes('duplicate column name')) {
      return
    }

    throw error
  }
}

export async function up({ db }: MigrateUpArgs): Promise<void> {
  for (const column of LOCALE_COLUMNS) {
    await addColumnIfMissing(db, column)
  }
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // No-op: SQLite/D1 doesn't support dropping columns directly.
}
