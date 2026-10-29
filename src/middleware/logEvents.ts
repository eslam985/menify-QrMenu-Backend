// /egyPyramidDashbord/backend/src/middleware/logEvents.js
import fsPromises from "fs/promises";
import fs from "fs";
import { format } from "date-fns";
import { v4 as uuid } from "uuid";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from "path";

import type { RequestHandler } from "express";


const __filename: string = fileURLToPath(import.meta.url);
const __dirname: string = dirname(__filename);


const logEvents = async (message: string, logName: string): Promise<void> => {
  const dateTime: string = `${format(new Date(), "yyyy:MM:dd\tHH:mm:ss")}`;
  const logItem: string = `${dateTime}\t${uuid()}\t${message}\n`;

  // على Vercel يتم الاعتماد على console.log فقط لأن نظام الملفات للقرأة فقط
  if (process.env.NODE_ENV === "production") {
    console.log(`[LOG]: ${logItem.trim()}`);
    return;
  }

  try {
    // تحديد المسار بناءً على مكان المجلد (هنا يستهدف backend/src/logs)
    const logsDir: string = path.join(__dirname, "..", "logs");

    if (!fs.existsSync(logsDir)) {
      await fsPromises.mkdir(logsDir);
    }
    await fsPromises.appendFile(path.join(logsDir, logName), logItem);
  } catch (err) {
    console.error("Failed to write log:", err);
  }
};

const logger: RequestHandler = (req, _res, next) => {
  logEvents(`${req.method}\t${req.headers.origin}\t${req.url}`, "reqLog.txt");
  console.log(`${req.method} ${req.path}`);
  next();
};

export { logger, logEvents };
