/**
 * download-models.js
 * Downloads face-api.js model weights into extension/public/models.
 * Pure Node 24 — uses built-in fetch and fs/promises.
 */
const fs = require("fs");
const path = require("path");

const BASE_URL =
  "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights";

const FILES = [
  "ssd_mobilenetv1_model-weights_manifest.json",
  "ssd_mobilenetv1_model-shard1",
  "ssd_mobilenetv1_model-shard2",
  "face_landmark_68_model-weights_manifest.json",
  "face_landmark_68_model-shard1",
  "face_recognition_model-weights_manifest.json",
  "face_recognition_model-shard1",
  "face_recognition_model-shard2"
];

const TARGET_DIR = path.resolve(
  __dirname,
  "..",
  "extension",
  "public",
  "models"
);

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function download(file) {
  const url = `${BASE_URL}/${file}`;
  const dest = path.join(TARGET_DIR, file);

  if (fs.existsSync(dest)) {
    const stat = await fs.promises.stat(dest);
    if (stat.size > 0) {
      console.log(`✓ ${file} (already present, ${stat.size} bytes)`);
      return;
    }
  }

  process.stdout.write(`↓ ${file} ... `);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.promises.writeFile(dest, buf);
  console.log(`done (${buf.length} bytes)`);
}

(async () => {
  try {
    await ensureDir(TARGET_DIR);
    console.log(`Saving face-api.js models to: ${TARGET_DIR}\n`);
    for (const file of FILES) {
      // eslint-disable-next-line no-await-in-loop
      await download(file);
    }
    console.log("\nAll models downloaded successfully.");
  } catch (err) {
    console.error("\nFailed to download models:", err.message);
    process.exit(1);
  }
})();
