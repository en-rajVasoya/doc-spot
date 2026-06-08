import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { createLogger, format, transports } from "winston";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logDir = path.join(__dirname, "../log");

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const getLogFileName = () => {
  const date = new Date().toISOString().split("T")[0];
  return path.join(logDir, `app-${date}.log`);
};

export const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.errors({ stack: true }),
    format.printf(({ timestamp, level, message, stack }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
    })
  ),
  transports: [
    new transports.File({
      filename: getLogFileName()
    })
  ]
});