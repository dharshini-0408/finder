import { env, pipeline } from "@huggingface/transformers";

export const MODEL_ID = "onnx-community/SMOGY-Ai-images-detector-ONNX";
// fp16 matches fp32 accuracy at half the download; q8 is smaller but noisier on real photos.
const MODEL_DTYPES = ["fp16", "q8"];
const LABEL_ALIASES = { artificial: "FAKE", human: "REAL" };
const VIDEO_FRAME_COUNT = 8;
const THUMBNAIL_WIDTH = 240;

// Transformers.js treats image-classification as "multimodal" and probes for a
// tokenizer this image-only model doesn't have, which logs a 404 in the console.
const defaultFetch = env.fetch;
env.fetch = (input, init) => {
  const url = typeof input === "string" ? input : input.url;
  if (url.includes(MODEL_ID) && url.endsWith("/tokenizer_config.json")) {
    return Promise.resolve(new Response(null, { status: 404 }));
  }
  return defaultFetch(input, init);
};

let detectorPromise = null;
let modelStatus = { state: "idle", progress: 0 };
const statusListeners = new Set();

function setModelStatus(next) {
  modelStatus = next;
  statusListeners.forEach((listener) => listener(modelStatus));
}

export function subscribeModelStatus(listener) {
  statusListeners.add(listener);
  listener(modelStatus);
  return () => statusListeners.delete(listener);
}

async function createPipeline() {
  let lastError;
  for (const dtype of MODEL_DTYPES) {
    try {
      return await pipeline("image-classification", MODEL_ID, {
        dtype,
        progress_callback: (info) => {
          if (info.status === "progress_total") {
            setModelStatus({ state: "loading", progress: info.progress });
          }
        },
      });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export function loadDetector() {
  if (!detectorPromise) {
    setModelStatus({ state: "loading", progress: 0 });
    detectorPromise = createPipeline().then(
      (detector) => {
        setModelStatus({ state: "ready", progress: 100 });
        return detector;
      },
      (error) => {
        detectorPromise = null;
        setModelStatus({ state: "error", progress: 0 });
        throw error;
      },
    );
  }
  return detectorPromise;
}

function waitForEvent(target, eventName) {
  return new Promise((resolve, reject) => {
    const onEvent = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Could not read video file"));
    };
    const cleanup = () => {
      target.removeEventListener(eventName, onEvent);
      target.removeEventListener("error", onError);
    };
    target.addEventListener(eventName, onEvent);
    target.addEventListener("error", onError);
  });
}

function toThumbnail(source, width, height) {
  const scale = Math.min(1, THUMBNAIL_WIDTH / width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.getContext("2d").drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.8);
}

async function extractVideoFrames(file, frameCount) {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.preload = "auto";
  video.src = url;

  try {
    await waitForEvent(video, "loadeddata");

    const { videoWidth: width, videoHeight: height } = video;
    const canSeek = Number.isFinite(video.duration) && video.duration > 0;
    const count = canSeek ? frameCount : 1;

    const frames = [];
    for (let i = 0; i < count; i++) {
      let time = 0;
      if (canSeek) {
        // Sample from the middle of each segment to skip black first/last frames.
        time = (video.duration * (i + 0.5)) / count;
        video.currentTime = time;
        await waitForEvent(video, "seeked");
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(video, 0, 0, width, height);
      frames.push({ canvas, time, thumbnail: toThumbnail(canvas, width, height) });
    }
    return frames;
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}

function sortScores(scores) {
  return scores
    .map(({ label, score }) => ({ label: LABEL_ALIASES[label.toLowerCase()] ?? label, score }))
    .sort((a, b) => b.score - a.score);
}

async function detectVideo(detector, file, onStep) {
  onStep({ stage: "extracting" });
  const frames = await extractVideoFrames(file, VIDEO_FRAME_COUNT);

  const totals = {};
  const frameResults = [];
  for (let i = 0; i < frames.length; i++) {
    onStep({ stage: "analyzing", current: i + 1, total: frames.length });
    const scores = await detector(frames[i].canvas);
    for (const { label, score } of scores) {
      totals[label] = (totals[label] ?? 0) + score;
    }
    frameResults.push({
      time: frames[i].time,
      thumbnail: frames[i].thumbnail,
      scores: sortScores(scores),
    });
  }

  const scores = Object.entries(totals).map(([label, total]) => ({
    label,
    score: total / frames.length,
  }));
  return { scores: sortScores(scores), frames: frameResults };
}

export default async function AiDetector(file, onStep = () => {}) {
  onStep({ stage: "loading-model" });
  const detector = await loadDetector();

  let result;
  if (file.type.startsWith("video/")) {
    result = await detectVideo(detector, file, onStep);
  } else if (file.type.startsWith("image/")) {
    onStep({ stage: "analyzing", current: 1, total: 1 });
    result = { scores: sortScores(await detector(file)), frames: null };
  } else {
    throw new Error(`Unsupported file type: ${file.type || "unknown"}`);
  }

  console.log("Detection result:", result);
  return result;
}
