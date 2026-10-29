import { Pool } from "pg";
import "dotenv/config";
import { CustomError } from "#src/utils/customErr.js";

if (!process.env.DATABASE_URL)
  throw new CustomError("DATABASE_URL ناقص في ملف .env", 500);

const pool: Pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

// التعامل مع أخطاء الاتصالات الخاملة لمنع انهيار التطبيق
pool.on("error", (err) => {
  console.error("❌ Unexpected DB error on idle client:", err.message);
});

export default pool;
