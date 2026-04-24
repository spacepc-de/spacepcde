import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { toMarkdown } from "./lib/html-to-markdown.mjs";
import { syncBlogContent } from "../src/lib/blogContent.ts";

const require = createRequire(import.meta.url);
const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const envPath = path.join(rootDir, ".env");
const manifestPath = path.join(rootDir, "page-export", "manifest.json");
const dryRun = process.argv.includes("--dry-run");
const payloadEntryPath = require.resolve("payload");
const payloadBinPath = path.resolve(path.dirname(payloadEntryPath), "..", "bin.js");

Object.assign(process.env, readEnvFile(envPath), process.env);
process.env.NODE_ENV ??= "production";
process.argv.push(payloadBinPath);

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
      }),
  );
}

function log(message) {
  console.log(`[page-export-posts-sql] ${message}`);
}

function ensureManifest() {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest nicht gefunden: ${manifestPath}`);
  }
}

function extractMarkdown(page) {
  const bodyBlocks = Array.isArray(page?.fields?.body) ? page.fields.body : [];
  const parts = bodyBlocks
    .map((block) => toMarkdown(String(block?.value ?? "").trim()))
    .filter(Boolean);

  return parts.join("\n\n").trim();
}

function normalizeExcerpt(page) {
  const excerpt = String(page?.fields?.intro ?? "").trim();
  if (!excerpt) return "";
  return toMarkdown(excerpt).replace(/\s+/g, " ").trim();
}

function normalizePublishedAt(page) {
  return page?.fields?.date || page.first_published_at || page.last_published_at || null;
}

function getPostCandidates(manifest) {
  return (manifest.pages ?? []).filter((page) => page?.model === "blog.blogpostpage");
}

async function ensureAuthor(db) {
  const existing = await db
    .prepare("SELECT id FROM authors WHERE url = ? LIMIT 1")
    .bind("spacepc")
    .first();

  if (existing?.id) {
    return existing.id;
  }

  if (dryRun) {
    log("DRY RUN: Autor 'spacepc.de' wuerde erstellt.");
    return "DRY_RUN_AUTHOR";
  }

  await db
    .prepare(
      "INSERT INTO authors (name, url, role, bio, updated_at, created_at) VALUES (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))",
    )
    .bind("spacepc.de", "spacepc", "Redaktion", "Importierter Standardautor fuer migrierte Blogposts.")
    .run();

  const created = await db
    .prepare("SELECT id FROM authors WHERE url = ? LIMIT 1")
    .bind("spacepc")
    .first();

  if (!created?.id) {
    throw new Error("Autor konnte nach dem Insert nicht gelesen werden.");
  }

  return created.id;
}

async function findExistingPost(db, slug) {
  return db
    .prepare(
      "SELECT blog_posts.id AS id FROM blog_posts LEFT JOIN blog_posts_locales ON blog_posts.id = blog_posts_locales._parent_id WHERE blog_posts_locales._locale = ? AND blog_posts_locales.url = ? LIMIT 1",
    )
    .bind("de", slug)
    .first();
}

async function upsertPost(db, config, page, authorId) {
  const title = String(page.title ?? "").trim();
  const url = String(page.slug ?? "").trim();
  const excerpt = normalizeExcerpt(page);
  const contentMarkdown = extractMarkdown(page);
  const publishedAt = normalizePublishedAt(page);

  if (!title || !url || !contentMarkdown) {
    log(`Uebersprungen: unvollstaendiger Post ${page.slug ?? "<ohne-slug>"}`);
    return;
  }

  const synced = await syncBlogContent({
    config,
    content: undefined,
    contentMarkdown,
  });

  const serializedContent = JSON.stringify(synced.content ?? null);
  const existing = await findExistingPost(db, url);

  if (dryRun) {
    log(`DRY RUN: ${existing ? "Update" : "Create"} ${url}`);
    return;
  }

  if (existing?.id) {
    await db
      .prepare(
        "UPDATE blog_posts SET author_id = ?, published_at = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?",
      )
      .bind(authorId, publishedAt, existing.id)
      .run();

    await db
      .prepare(
        "UPDATE blog_posts_locales SET title = ?, url = ?, excerpt = ?, content = ?, content_markdown = ? WHERE _parent_id = ? AND _locale = ?",
      )
      .bind(title, url, excerpt || null, serializedContent, contentMarkdown, existing.id, "de")
      .run();

    log(`Aktualisiert: ${url}`);
    return;
  }

  const created = await db
    .prepare(
      "INSERT INTO blog_posts (author_id, published_at, updated_at, created_at) VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) RETURNING id",
    )
    .bind(authorId, publishedAt)
    .first();

  if (!created?.id) {
    throw new Error(`Post ${url} konnte nicht erstellt werden.`);
  }

  await db
    .prepare(
      "INSERT INTO blog_posts_locales (title, url, excerpt, content, content_markdown, _locale, _parent_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(title, url, excerpt || null, serializedContent, contentMarkdown, "de", created.id)
    .run();

  log(`Erstellt: ${url}`);
}

async function main() {
  ensureManifest();

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const posts = getPostCandidates(manifest);
  log(`${posts.length} Blogposts im Export gefunden.`);

  if (posts.length === 0) {
    return;
  }

  const [{ getPlatformProxy }, { getPayloadConfig }] = await Promise.all([
    import("wrangler"),
    import("../src/payload.config.ts"),
  ]);

  const [{ env }, payloadConfig] = await Promise.all([
    getPlatformProxy({
      envFiles: [],
      environment: process.env.CLOUDFLARE_ENV,
      remoteBindings: true,
    }),
    getPayloadConfig(),
  ]);

  const authorId = await ensureAuthor(env.D1);

  for (const page of posts) {
    await upsertPost(env.D1, payloadConfig, page, authorId);
  }

  log(`Import abgeschlossen${dryRun ? " (dry run)" : ""}.`);
}

main().catch((error) => {
  console.error("[page-export-posts-sql] Import fehlgeschlagen");
  console.error(error);
  process.exitCode = 1;
});
