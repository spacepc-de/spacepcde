import fs from "node:fs";
import path from "node:path";
import { toMarkdown } from "./lib/html-to-markdown.mjs";

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const envPath = path.join(rootDir, ".env");
const manifestPath = path.join(rootDir, "page-export", "manifest.json");

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

const env = { ...readEnvFile(envPath), ...process.env };
const payloadBaseURL = (env.PAYLOAD_IMPORT_BASE_URL ?? env.PAYLOAD_PUBLIC_SERVER_URL ?? "").replace(
  /\/+$/,
  "",
);
const adminEmail = env.PAYLOAD_IMPORT_EMAIL ?? env.PAYLOAD_ADMIN_EMAIL ?? "";
const adminPassword = env.PAYLOAD_IMPORT_PASSWORD ?? env.PAYLOAD_ADMIN_PASSWORD ?? "";
const dryRun = process.argv.includes("--dry-run");

function log(message) {
  console.log(`[page-export-posts] ${message}`);
}

function ensureEnv() {
  if (!payloadBaseURL) {
    throw new Error("PAYLOAD_IMPORT_BASE_URL oder PAYLOAD_PUBLIC_SERVER_URL ist nicht gesetzt.");
  }

  if (!adminEmail || !adminPassword) {
    throw new Error("PAYLOAD_IMPORT_EMAIL und PAYLOAD_IMPORT_PASSWORD muessen gesetzt sein.");
  }

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest nicht gefunden: ${manifestPath}`);
  }
}

async function request(pathname, { method = "GET", token, body } = {}) {
  const response = await fetch(`${payloadBaseURL}${pathname}`, {
    method,
    headers: {
      ...(token ? { Authorization: `JWT ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(`${method} ${pathname} failed with ${response.status}: ${JSON.stringify(data)}`);
  }

  return data;
}

async function login() {
  const result = await request("/api/users/login", {
    method: "POST",
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });

  if (!result?.token) {
    throw new Error("Login erfolgreich, aber kein Token erhalten.");
  }

  return result.token;
}

async function findOneByField(token, collection, field, value) {
  const params = new URLSearchParams();
  params.set("limit", "1");
  params.set(`where[${field}][equals]`, String(value));
  params.set("depth", "0");
  params.set("locale", "de");
  params.set("fallback-locale", "false");

  const result = await request(`/api/${collection}?${params.toString()}`, { token });
  return result?.docs?.[0] ?? null;
}

async function ensureAuthor(token) {
  const existing = await findOneByField(token, "authors", "url", "spacepc");

  if (existing) {
    return existing.id;
  }

  if (dryRun) {
    log("DRY RUN: Autor 'spacepc.de' wuerde erstellt.");
    return "DRY_RUN_AUTHOR";
  }

  const created = await request("/api/authors?locale=de&fallback-locale=false", {
    method: "POST",
    token,
    body: {
      bio: "Importierter Standardautor fuer migrierte Blogposts.",
      name: "spacepc.de",
      role: "Redaktion",
      url: "spacepc",
    },
  });

  return created.doc.id;
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
  return {
    author: authorId,
    contentMarkdown: extractMarkdown(page),
    excerpt: normalizeExcerpt(page) || undefined,
    publishedAt: normalizePublishedAt(page),
    title: String(page.title ?? "").trim(),
    url: String(page.slug ?? "").trim(),
  };
}

async function upsertPost(token, page, authorId) {
  const postData = mapPageToPayloadPost(page, authorId);

  if (!postData.title || !postData.url || !postData.contentMarkdown) {
    log(`Uebersprungen: unvollstaendiger Post ${page.slug ?? "<ohne-slug>"}`);
    return;
  }

  const existing = await findOneByField(token, "blog-posts", "url", postData.url);

  if (dryRun) {
    log(`DRY RUN: ${existing ? "Update" : "Create"} ${postData.url}`);
    return;
  }

  if (existing) {
    await request(`/api/blog-posts/${existing.id}?locale=de&fallback-locale=false`, {
      method: "PATCH",
      token,
      body: postData,
    });
    log(`Aktualisiert: ${postData.url}`);
    return;
  }

  await request("/api/blog-posts?locale=de&fallback-locale=false", {
    method: "POST",
    token,
    body: postData,
  });
  log(`Erstellt: ${postData.url}`);
}

async function main() {
  ensureEnv();

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const posts = getPostCandidates(manifest);

  log(`${posts.length} Blogposts im Export gefunden.`);

  if (posts.length === 0) {
    return;
  }

  const token = await login();
  const authorId = await ensureAuthor(token);

  for (const page of posts) {
    await upsertPost(token, page, authorId);
  }

  log(`Import abgeschlossen${dryRun ? " (dry run)" : ""}.`);
}

main().catch((error) => {
  console.error("[page-export-posts] Import fehlgeschlagen");
  console.error(error);
  process.exitCode = 1;
});
