import SparkMD5 from "spark-md5";

const hashFile = async (file) => {
  const blob = file.slice(0, 2 * 1024 * 1024);
  const buffer = await blob.arrayBuffer();
  const spark = new SparkMD5.ArrayBuffer();
  spark.append(buffer);
  const hash = spark.end();
  const name = encodeURIComponent(file.name.trim());
  return `spot-${name}-${file.size}-${hash}`;
};

self.onmessage = async (e) => {
  const { files, batchId } = e.data;

  const results = await Promise.all(
    files.map(async (file) => {
      try {
        const fingerprint = await hashFile(file);
        const filekey = file.webkitRelativePath || file.name;
        return { success: true, fingerprint, filekey };
      } catch (err) {
        const filekey = file.webkitRelativePath || file.name;
        return { success: false, filekey, error: err.message };
      }
    })
  );

  self.postMessage({ batchId, results });
};