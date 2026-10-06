const worker = new Worker(
  new URL("../workers/fileHashWorker.js", import.meta.url),
  { type: "module" }
);

const pending = new Map();

worker.onmessage = (e) => {
  const { batchId, results } = e.data;
  const resolve = pending.get(batchId);
  if (!resolve) return;
  pending.delete(batchId);
  resolve(results);
};

worker.onerror = (err) => {
  console.error("[WORKER CRASHED]:", err.message, err);
  pending.forEach(p => p([]));
  pending.clear();
};

let batchCounter = 0;

export function generateFingerprintBatch(files) {
  const batchId = batchCounter++;
  return new Promise((resolve) => {
    pending.set(batchId, resolve);
    const filesWithKeys = files.map(file => ({
      file,
      filekey: file.webkitRelativePath || file.name
    }));
    worker.postMessage({ files: filesWithKeys, batchId });
  });
}