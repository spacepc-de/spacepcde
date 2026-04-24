import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-d1-sqlite'

const INDEX_NAME = 'comments_post_approved_created_idx'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(
    sql`CREATE INDEX IF NOT EXISTS \`${sql.raw(INDEX_NAME)}\` ON \`comments\` (\`post_id\`, \`approved\`, \`created_at\`);`,
  )
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX IF EXISTS \`${sql.raw(INDEX_NAME)}\`;`)
}
