import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-d1-sqlite'

async function addColumnIfMissing(db: MigrateUpArgs['db']) {
  try {
    await db.run(sql`ALTER TABLE \`comments\` ADD COLUMN \`parent_id\` integer;`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    if (message.includes('duplicate column name')) {
      return
    }

    throw error
  }
}

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await addColumnIfMissing(db)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`comments_parent_idx\` ON \`comments\` (\`parent_id\`);`)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // No-op: SQLite/D1 doesn't support dropping columns directly.
}
