import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";

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
  console.log(`[import-featured-images] ${message}`);
}

function ensureManifest() {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest nicht gefunden: ${manifestPath}`);
  }
}

function getImageJobs(manifest) {
  const images = manifest.images ?? {};

  return (manifest.pages ?? [])
    .filter((page) => page?.model === "blog.blogpostpage" && page?.fields?.feed_image_ref)
    .map((page) => {
      const ref = page.fields.feed_image_ref;
      const image = images[ref];

      if (!image?.file) {
        return null;
      }

      return {
        alt: image.title || page.title,
        filePath: path.join(rootDir, "page-export", image.file),
        filename: path.basename(image.file),
        ref,
        slug: page.slug,
        title: page.title,
      };
    })
    .filter(Boolean);
}

async function findMediaByFilename(payload, filename) {
  const result = await payload
    .prepare("SELECT id FROM media WHERE filename = ? LIMIT 1")
    .bind(filename)
    .first();

  return result?.id ?? null;
}

function getMimeType(filename) {
  const extension = path.extname(filename).toLowerCase();

  switch (extension) {
    case ".avif":
      return "image/avif";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

function getImageDimensions(filePath) {
  try {
    const output = execFileSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", filePath], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const width = Number(output.match(/pixelWidth:\s+(\d+)/)?.[1] ?? 0);
    const height = Number(output.match(/pixelHeight:\s+(\d+)/)?.[1] ?? 0);

    return {
      width: width || null,
      height: height || null,
    };
  } catch {
    return {
      width: null,
      height: null,
    };
  }
}

async function ensureMedia(db, bucket, job) {
  const existing = await findMediaByFilename(db, job.filename);

  if (existing) {
    const object = await bucket.head(job.filename);

    if (!object) {
      const file = fs.readFileSync(job.filePath);
      const mimeType = getMimeType(job.filename);

      await bucket.put(job.filename, new Blob([file]), {
        httpMetadata: {
          contentType: mimeType,
        },
      });
    }

    return existing;
  }

  if (dryRun) {
    log(`DRY RUN: Media create ${job.filename}`);
    return "DRY_RUN_MEDIA";
  }

  const file = fs.readFileSync(job.filePath);
  const stats = fs.statSync(job.filePath);
  const { width, height } = getImageDimensions(job.filePath);
  const mimeType = getMimeType(job.filename);

  await bucket.put(job.filename, new Blob([file]), {
    httpMetadata: {
      contentType: mimeType,
    },
  });

  await db
    .prepare(
      "INSERT INTO media (alt, filename, mime_type, filesize, width, height, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))",
    )
    .bind(job.alt, job.filename, mimeType, stats.size, width, height)
    .run();

  return findMediaByFilename(db, job.filename);
}

async function findPostId(db, slug) {
  const result = await db
    .prepare(
      "SELECT blog_posts.id AS id FROM blog_posts LEFT JOIN blog_posts_locales ON blog_posts.id = blog_posts_locales._parent_id WHERE blog_posts_locales._locale = ? AND blog_posts_locales.url = ? LIMIT 1",
    )
    .bind("de", slug)
    .first();

  return result?.id ?? null;
}

async function attachFeaturedImage(db, slug, mediaId) {
  const postId = await findPostId(db, slug);

  if (!postId) {
    log(`Uebersprungen: Post nicht gefunden fuer ${slug}`);
    return;
  }

  if (dryRun) {
    log(`DRY RUN: featuredImage ${slug} -> ${mediaId}`);
    return;
  }

  await db
    .prepare(
      "UPDATE blog_posts SET featured_image_id = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?",
    )
    .bind(mediaId, postId)
    .run();

  log(`Verknuepft: ${slug} -> media ${mediaId}`);
}

async function main() {
  ensureManifest();

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const jobs = getImageJobs(manifest);

  log(`${jobs.length} Featured-Image-Zuordnungen gefunden.`);

  const { getPlatformProxy } = await import("wrangler");
  const { env } = await getPlatformProxy({
      envFiles: [],
      environment: process.env.CLOUDFLARE_ENV,
      remoteBindings: true,
    });

  for (const job of jobs) {
    const mediaId = await ensureMedia(env.D1, env.R2, job);
    await attachFeaturedImage(env.D1, job.slug, mediaId);
  }

  log(`Featured-Image-Import abgeschlossen${dryRun ? " (dry run)" : ""}.`);
}

main().catch((error) => {
  console.error("[import-featured-images] Import fehlgeschlagen");
  console.error(error);
  process.exitCode = 1;
});
