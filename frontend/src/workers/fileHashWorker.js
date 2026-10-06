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
    files.map(async ({ file, filekey }) => {
      try {
        const fingerprint = await hashFile(file);
        return { success: true, fingerprint, filekey };
      } catch (err) {
        console.error("hashFile failed:", file.name, err);
        return {
          success: false,
          filekey,
          fingerprint: `spot-${encodeURIComponent(file.name.trim())}-${file.size}-${file.lastModified}`,
          error: err.message
        };
      }
    })
  );

  self.postMessage({ batchId, results });
};