import { Pool } from "pg";
import "dotenv/config";
import { CustomError } from "#src/utils/customErr.js";

if (!process.env.DATABASE_URL)
  throw new CustomError("DATABASE_URL ناقص في ملف .env", 500);

const pool: Pool = new Pool({
  connectionString: process.env.DATABASE_URL, // must be the Supabase TRANSACTION pooler (port 6543)
  ssl: { rejectUnauthorized: false },
  max: process.env.VERCEL ? 3 : 10,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,  // fail fast instead of hanging 15s under load
  statement_timeout: 15_000,       // a slow query can't hold a connection forever
});

// التعامل مع أخطاء الاتصالات الخاملة لمنع انهيار التطبيق
pool.on("error", (err) => {
  console.error("❌ Unexpected DB error on idle client:", err.message);
});

export default pool;
