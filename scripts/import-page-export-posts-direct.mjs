import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { getPayload } from "payload";

import { toMarkdown } from "./lib/html-to-markdown.mjs";

const require = createRequire(import.meta.url);
const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const envPath = path.join(rootDir, ".env");
const manifestPath = path.join(rootDir, "page-export", "manifest.json");
const dryRun = process.argv.includes("--dry-run");
const payloadEntryPath = require.resolve("payload");
const payloadBinPath = path.resolve(path.dirname(payloadEntryPath), "..", "bin.js");

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

Object.assign(process.env, readEnvFile(envPath), process.env);
process.env.NODE_ENV ??= "production";
process.argv.push(payloadBinPath);

function log(message) {
  console.log(`[page-export-posts-direct] ${message}`);
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
  return page.first_published_at || page.last_published_at || null;
}

function getPostCandidates(manifest) {
  return (manifest.pages ?? []).filter((page) => page?.model === "blog.blogpostpage");
}

function mapPageToPayloadPost(page, authorId) {
  const seoTitle = String(page?.seo_title ?? "").trim();
  const seoDescription = String(page?.search_description ?? "").trim();

  return {
    author: authorId,
    contentMarkdown: extractMarkdown(page),
    excerpt: normalizeExcerpt(page) || undefined,
    publishedAt: normalizePublishedAt(page),
    seoDescription: seoDescription || undefined,
    seoTitle: seoTitle || undefined,
    title: String(page.title ?? "").trim(),
    url: String(page.slug ?? "").trim(),
  };
}

async function findOneByField(payload, collection, field, value) {
  const result = await payload.find({
    collection,
    depth: 0,
    fallbackLocale: false,
    limit: 1,
    locale: "de",
    overrideAccess: true,
    where: {
      [field]: {
        equals: value,
      },
    },
  });

  return result?.docs?.[0] ?? null;
}

async function ensureAuthor(payload) {
  const existing = await findOneByField(payload, "authors", "url", "spacepc");

  if (existing) {
    return existing.id;
  }

  if (dryRun) {
    log("DRY RUN: Autor 'spacepc.de' wuerde erstellt.");
    return "DRY_RUN_AUTHOR";
  }

  const created = await payload.create({
    collection: "authors",
    data: {
      bio: "Importierter Standardautor fuer migrierte Blogposts.",
      name: "spacepc.de",
      role: "Redaktion",
      url: "spacepc",
    },
    depth: 0,
    fallbackLocale: false,
    locale: "de",
    overrideAccess: true,
  });

  return created.id;
}

async function upsertPost(payload, page, authorId) {
  const postData = mapPageToPayloadPost(page, authorId);

  if (!postData.title || !postData.url || !postData.contentMarkdown) {
    log(`Uebersprungen: unvollstaendiger Post ${page.slug ?? "<ohne-slug>"}`);
    return;
  }

  const existing = await findOneByField(payload, "blog-posts", "url", postData.url);

  if (dryRun) {
    log(`DRY RUN: ${existing ? "Update" : "Create"} ${postData.url}`);
    return;
  }

  if (existing) {
    await payload.update({
      collection: "blog-posts",
      id: existing.id,
      data: postData,
      depth: 0,
      fallbackLocale: false,
      locale: "de",
      overrideAccess: true,
    });
    log(`Aktualisiert: ${postData.url}`);
    return;
  }

  await payload.create({
    collection: "blog-posts",
    data: postData,
    depth: 0,
    fallbackLocale: false,
    locale: "de",
    overrideAccess: true,
  });
  log(`Erstellt: ${postData.url}`);
}

async function main() {
  ensureManifest();

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const posts = getPostCandidates(manifest);

  log(`${posts.length} Blogposts im Export gefunden.`);

  if (posts.length === 0) {
    return;
  }

  const { getPayloadConfig } = await import("../src/payload.config.ts");
  const payload = await getPayload({ config: await getPayloadConfig() });
  const authorId = await ensureAuthor(payload);

  for (const page of posts) {
    await upsertPost(payload, page, authorId);
  }

  log(`Import abgeschlossen${dryRun ? " (dry run)" : ""}.`);
}

main().catch((error) => {
  console.error("[page-export-posts-direct] Import fehlgeschlagen");
  console.error(error);
  process.exitCode = 1;
});
