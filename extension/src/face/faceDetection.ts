import "./canvasPatch";
import * as faceapi from "face-api.js";

let modelsLoaded = false;
let loadingPromise: Promise<void> | null = null;

interface NeuralNet {
  getDefaultModelName(): string;
  loadFromWeightMap(weightMap: unknown): void;
}

/**
 * Resolve the URL where face-api.js model files live. In an extension page
 * (popup, options) we use chrome.runtime.getURL so the URL is absolute and
 * pinned to the extension origin.
 */
function getModelsUrl(): string {
  if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
    return chrome.runtime.getURL("models/");
  }
  return "/models/";
}

/**
 * Load a single face-api.js model by manually fetching its weights manifest
 * and shards, then handing the resulting weight map to face-api.js.
 *
 * We can't use the built-in `loadFromUri` because face-api.js's
 * `getModelUris` helper only knows about `http://` and `https://` and
 * mangles `chrome-extension://...` URIs into `chrome-extension:/...`
 * (single slash), which makes every fetch fail with "Failed to fetch".
 */
async function loadFaceApiModel(
  net: unknown,
  baseUrl: string
): Promise<void> {
  const network = net as NeuralNet;
  const modelName = network.getDefaultModelName();
  const manifestUrl = `${baseUrl}${modelName}-weights_manifest.json`;

  let manifestRes: Response;
  try {
    manifestRes = await fetch(manifestUrl);
  } catch (err) {
    throw new Error(
      `Network error fetching ${modelName} manifest at ${manifestUrl}: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
  if (!manifestRes.ok) {
    throw new Error(
      `HTTP ${manifestRes.status} fetching ${modelName} manifest at ${manifestUrl}`
    );
  }
  const manifest = await manifestRes.json();

  const fetchWeights = async (urls: string[]): Promise<ArrayBuffer[]> => {
    return Promise.all(
      urls.map(async (url) => {
        let res: Response;
        try {
          res = await fetch(url);
        } catch (err) {
          throw new Error(
            `Network error fetching weight shard ${url}: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        }
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} fetching weight shard ${url}`);
        }
        return res.arrayBuffer();
      })
    );
  };

  const tfIo = (
    faceapi as unknown as {
      tf: {
        io: {
          weightsLoaderFactory: (
            fetcher: (urls: string[]) => Promise<ArrayBuffer[]>
          ) => (
            manifest: unknown,
            filePathPrefix?: string
          ) => Promise<unknown>;
        };
      };
    }
  ).tf.io;

  const loadWeights = tfIo.weightsLoaderFactory(fetchWeights);
  // weightsLoaderFactory expects the directory the shards live in. Strip the
  // trailing slash because tfjs adds its own when joining paths.
  const baseDir = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const weightMap = await loadWeights(manifest, baseDir);
  network.loadFromWeightMap(weightMap);
}

export async function initializeFaceDetection(): Promise<void> {
  if (modelsLoaded) return;
  if (loadingPromise) return loadingPromise;

  const url = getModelsUrl();
  loadingPromise = (async (): Promise<void> => {
    try {
      await Promise.all([
        loadFaceApiModel(faceapi.nets.ssdMobilenetv1, url),
        loadFaceApiModel(faceapi.nets.faceLandmark68Net, url),
        loadFaceApiModel(faceapi.nets.faceRecognitionNet, url),
      ]);
    } catch (err) {
      throw new Error(
        `Could not load face-recognition AI models: ${
          err instanceof Error ? err.message : String(err)
        }. Run \`npm run build\` in extension/ and reload the extension in chrome://extensions.`
      );
    }
    modelsLoaded = true;
  })();

  try {
    await loadingPromise;
  } finally {
    loadingPromise = null;
  }
}

export function areModelsLoaded(): boolean {
  return modelsLoaded;
}

export type DetectionWithDescriptor = faceapi.WithFaceDescriptor<
  faceapi.WithFaceLandmarks<
    { detection: faceapi.FaceDetection },
    faceapi.FaceLandmarks68
  >
>;

export async function detectFaces(
  video: HTMLVideoElement
): Promise<DetectionWithDescriptor[]> {
  if (!modelsLoaded) {
    await initializeFaceDetection();
  }
  const options = new faceapi.SsdMobilenetv1Options({
    minConfidence: 0.5,
    maxResults: 5,
  });
  const results = await faceapi
    .detectAllFaces(video, options)
    .withFaceLandmarks()
    .withFaceDescriptors();
  return results;
}

export async function isFacePresent(video: HTMLVideoElement): Promise<boolean> {
  if (!modelsLoaded) {
    await initializeFaceDetection();
  }
  const options = new faceapi.SsdMobilenetv1Options({
    minConfidence: 0.5,
    maxResults: 1,
  });
  const detection = await faceapi.detectSingleFace(video, options);
  return Boolean(detection);
}

export async function getFaceDescriptor(
  video: HTMLVideoElement
): Promise<Float32Array | null> {
  if (!modelsLoaded) {
    await initializeFaceDetection();
  }
  const options = new faceapi.SsdMobilenetv1Options({
    minConfidence: 0.5,
    maxResults: 1,
  });
  const result = await faceapi
    .detectSingleFace(video, options)
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!result) return null;
  return result.descriptor;
}

export async function getFaceDescriptorWithScore(
  video: HTMLVideoElement
): Promise<{ descriptor: Float32Array; score: number } | null> {
  if (!modelsLoaded) {
    await initializeFaceDetection();
  }
  const options = new faceapi.SsdMobilenetv1Options({
    minConfidence: 0.5,
    maxResults: 1,
  });
  const result = await faceapi
    .detectSingleFace(video, options)
    .withFaceLandmarks()
    .withFaceDescriptor();
  if (!result) return null;
  return {
    descriptor: result.descriptor,
    score: result.detection.score,
  };
}
