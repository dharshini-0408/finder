const MB = 1024 * 1024;
// Metadata lives in the file header and trailer. Scanning only those keeps short
// names like "GIMP" from matching by chance inside compressed pixel data.
const SCAN_RANGES = {
  image: { head: 1 * MB, tail: MB / 4 },
  video: { head: 6 * MB, tail: 6 * MB },
};
const ELA_MAX_PIXELS = 16_000_000;
const ELA_QUALITY = 0.9;
const ELA_BLOCK = 8;
const ELA_MAP_WIDTH = 1024;
// Ratio of the 99th-percentile block error to the median block error. Above
// this, compression is uneven enough to suggest pasted or retouched regions.
const ELA_UNEVEN_RATIO = 12;

// Editors and generators write their names into EXIF/XMP/container metadata.
const EDITORS = [
  ["Adobe Photoshop", "Adobe Photoshop"],
  ["Lightroom", "Adobe Lightroom"],
  ["GIMP", "GIMP"],
  ["Snapseed", "Snapseed"],
  ["Pixelmator", "Pixelmator"],
  ["Affinity Photo", "Affinity Photo"],
  ["PicsArt", "PicsArt"],
  ["Facetune", "Facetune"],
  ["Canva", "Canva"],
  ["Meitu", "Meitu"],
  ["VSCO", "VSCO"],
  ["Luminar", "Luminar"],
  ["Capture One", "Capture One"],
  ["Paint.NET", "Paint.NET"],
  ["Fotor", "Fotor"],
  ["Photoroom", "Photoroom"],
  ["Remini", "Remini"],
  ["CapCut", "CapCut"],
  ["InShot", "InShot"],
  ["Premiere", "Adobe Premiere"],
  ["After Effects", "Adobe After Effects"],
  ["Final Cut", "Final Cut Pro"],
  ["DaVinci Resolve", "DaVinci Resolve"],
  ["iMovie", "iMovie"],
  ["KineMaster", "KineMaster"],
  ["Videoleap", "Videoleap"],
  ["Filmora", "Filmora"],
  ["Clipchamp", "Clipchamp"],
  ["HandBrake", "HandBrake"],
];

const AI_GENERATORS = [
  ["trainedAlgorithmicMedia", "AI-generated (IPTC source tag)"],
  ["Midjourney", "Midjourney"],
  ["Stable Diffusion", "Stable Diffusion"],
  ["DALL-E", "DALL·E"],
  ["DALL·E", "DALL·E"],
  ["Adobe Firefly", "Adobe Firefly"],
  ["NovelAI", "NovelAI"],
  ["ComfyUI", "ComfyUI"],
  // Names written by C2PA manifests (claim generator / software agent).
  ["OpenAI", "OpenAI"],
  ["ChatGPT", "ChatGPT"],
  ["GPT-4o", "ChatGPT (GPT-4o)"],
  ["Gemini", "Google Gemini"],
  ["Imagen", "Google Imagen"],
  ["Nano Banana", "Google Nano Banana"],
  ["Ideogram", "Ideogram"],
  ["Leonardo.Ai", "Leonardo.Ai"],
  ["Bing Image Creator", "Bing Image Creator"],
  ["Microsoft Designer", "Microsoft Designer"],
  ["Meta AI", "Meta AI"],
  ["Grok", "Grok"],
  ["FLUX", "FLUX"],
];

async function readMetadataText(file) {
  const { head, tail } = file.type.startsWith("video/")
    ? SCAN_RANGES.video
    : SCAN_RANGES.image;
  const slices =
    file.size <= head + tail
      ? [file]
      : [file.slice(0, head), file.slice(file.size - tail)];
  const decoder = new TextDecoder("latin1");
  const parts = await Promise.all(
    slices.map(async (slice) => decoder.decode(await slice.arrayBuffer())),
  );
  return parts.join("\n");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsWord(text, needle) {
  if (!text.includes(needle)) return false;
  return new RegExp(`(^|[^A-Za-z0-9])${escapeRegExp(needle)}($|[^A-Za-z0-9])`).test(
    text,
  );
}

export function scanMetadata(text) {
  const signals = [];
  const seen = new Set();

  function add(signal) {
    if (seen.has(signal.detail)) return;
    seen.add(signal.detail);
    signals.push(signal);
  }

  if (text.includes("compositeWithTrainedAlgorithmicMedia")) {
    add({
      kind: "edit",
      strength: "strong",
      label: "AI edit",
      detail: "Edited with generative AI (IPTC source tag)",
    });
  }

  for (const [needle, name] of AI_GENERATORS) {
    if (containsWord(text, needle)) {
      add({ kind: "ai", strength: "strong", label: "AI tool", detail: name });
    }
  }

  for (const [needle, name] of EDITORS) {
    if (containsWord(text, needle)) {
      add({ kind: "edit", strength: "strong", label: "Software", detail: name });
    }
  }

  if (text.includes("Lavf")) {
    add({
      kind: "info",
      strength: "weak",
      label: "Re-encoded",
      detail: "Processed with FFmpeg",
    });
  }

  if (text.includes("c2pa")) {
    add({
      kind: "info",
      strength: "weak",
      label: "Credentials",
      detail: "Content Credentials (C2PA) present",
    });
  }

  const hasExif = text.includes("Exif\0\0");
  const hasXmp = text.includes("x:xmpmeta");
  return { signals, hasMetadata: hasExif || hasXmp };
}

function isJpeg(file) {
  return file.type === "image/jpeg" || /\.jpe?g$/i.test(file.name);
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Encoding failed"))),
      type,
      quality,
    );
  });
}

function percentile(sorted, fraction) {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))];
}

async function errorLevelAnalysis(file) {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  if (width * height > ELA_MAX_PIXELS) {
    bitmap.close();
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  const original = context.getImageData(0, 0, width, height).data;

  const resaved = await createImageBitmap(
    await canvasToBlob(canvas, "image/jpeg", ELA_QUALITY),
  );
  context.drawImage(resaved, 0, 0);
  resaved.close();
  const output = context.getImageData(0, 0, width, height);
  const recompressed = output.data;

  const blocksX = Math.ceil(width / ELA_BLOCK);
  const blocksY = Math.ceil(height / ELA_BLOCK);
  const blockSums = new Float64Array(blocksX * blocksY);
  const blockCounts = new Uint32Array(blocksX * blocksY);
  const errors = new Float32Array(width * height);

  for (let y = 0; y < height; y++) {
    const blockRow = Math.floor(y / ELA_BLOCK) * blocksX;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const error =
        (Math.abs(original[i] - recompressed[i]) +
          Math.abs(original[i + 1] - recompressed[i + 1]) +
          Math.abs(original[i + 2] - recompressed[i + 2])) /
        3;
      errors[y * width + x] = error;
      const block = blockRow + Math.floor(x / ELA_BLOCK);
      blockSums[block] += error;
      blockCounts[block] += 1;
    }
  }

  const blockMeans = Array.from(blockSums, (sum, i) => sum / blockCounts[i]).sort(
    (a, b) => a - b,
  );
  const median = percentile(blockMeans, 0.5);
  const p99 = percentile(blockMeans, 0.99);
  const ratio = p99 / Math.max(median, 0.5);

  const scale = 220 / Math.max(p99, 1);
  for (let i = 0; i < errors.length; i++) {
    const value = Math.min(255, errors[i] * scale);
    const j = i * 4;
    recompressed[j] = value;
    recompressed[j + 1] = value;
    recompressed[j + 2] = value;
    recompressed[j + 3] = 255;
  }
  context.putImageData(output, 0, 0);

  const mapScale = Math.min(1, ELA_MAP_WIDTH / width);
  const map = document.createElement("canvas");
  map.width = Math.round(width * mapScale);
  map.height = Math.round(height * mapScale);
  map.getContext("2d").drawImage(canvas, 0, 0, map.width, map.height);

  return { ratio, map: map.toDataURL("image/jpeg", 0.85) };
}

export default async function detectEdits(file) {
  const { signals, hasMetadata } = scanMetadata(await readMetadataText(file));

  let ela = null;
  if (isJpeg(file)) {
    try {
      ela = await errorLevelAnalysis(file);
    } catch (error) {
      console.warn("Error level analysis failed:", error);
    }
  }

  if (ela && ela.ratio > ELA_UNEVEN_RATIO) {
    signals.push({
      kind: "edit",
      strength: "weak",
      label: "Compression",
      detail: "Uneven error levels, check the error map",
    });
  }

  if (!hasMetadata && file.type.startsWith("image/")) {
    signals.push({
      kind: "info",
      strength: "weak",
      label: "Metadata",
      detail: "Stripped (common after screenshots or social apps)",
    });
  }

  const edits = signals.filter((signal) => signal.kind === "edit");
  let status = "clean";
  if (edits.some((signal) => signal.strength === "strong")) status = "edited";
  else if (edits.length > 0) status = "possible";

  return { status, signals, elaMap: ela?.map ?? null };
}
