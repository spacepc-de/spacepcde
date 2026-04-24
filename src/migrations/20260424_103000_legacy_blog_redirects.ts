import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-d1-sqlite'

const REDIRECTS = [
  {
    fromPath: '/meshtastic-vs-meshcore-welches-lora-mesh-passt-zu-dir/',
    toPath: '/de/meshtastic-vs-meshcore-welches-lora-mesh-passt-zu-dir',
  },
  {
    fromPath: '/wetter-display-mit-esp32-und-3d-druck-gehaeuse/',
    toPath: '/de/wetter-display-mit-esp32-und-3d-druck-gehaeuse',
  },
  {
    fromPath: '/luftqualitaetssensor-mittels-esp32-co2-luftfeuchtigkeit-temperatur/',
    toPath: '/de/luftqualitaetssensor-mittels-esp32-co2-luftfeuchtigkeit-temperatur',
  },
  {
    fromPath: '/anormales-verhalten-erkennen-mit-zabbix/',
    toPath: '/de/anormales-verhalten-erkennen-mit-zabbix',
  },
] as const

export async function up({ db }: MigrateUpArgs): Promise<void> {
  for (const redirect of REDIRECTS) {
    await db.run(sql`
      INSERT INTO \`redirects\` (\`from_path\`, \`to_path\`, \`status_code\`, \`is_enabled\`, \`updated_at\`, \`created_at\`)
      VALUES (
        ${redirect.fromPath},
        ${redirect.toPath},
        '301',
        true,
        strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
        strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      )
      ON CONFLICT(\`from_path\`) DO UPDATE SET
        \`to_path\` = excluded.\`to_path\`,
        \`status_code\` = excluded.\`status_code\`,
        \`is_enabled\` = excluded.\`is_enabled\`,
        \`updated_at\` = strftime('%Y-%m-%dT%H:%M:%fZ', 'now');
    `)
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  for (const redirect of REDIRECTS) {
    await db.run(sql`DELETE FROM \`redirects\` WHERE \`from_path\` = ${redirect.fromPath};`)
  }
}
