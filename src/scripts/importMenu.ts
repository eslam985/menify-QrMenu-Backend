
import pool from "#src/config/dbConn.js";
import { importMenuBulkService } from "#src/service/data/menuBulkService.js";
import "dotenv/config";
import fs from "fs";
import path from "path";

const RESTAURANT_ID = process.env.RESTAURANT_ID;
const FILE_PATH = process.env.FILE_PATH
const JSON_FILE_PATH = path.resolve(FILE_PATH ?? '');

async function runImport() {
  try {
    if (!fs.existsSync(JSON_FILE_PATH) || JSON_FILE_PATH === '') {
      console.error(`❌ ملف الجيسون غير موجود في المسار: ${JSON_FILE_PATH}`);
      process.exit(1);
    }

    if(!RESTAURANT_ID) {
      console.error(`RESTAURANT_ID Can Not Be: ${RESTAURANT_ID}`)
      process.exit(1)
    }

    console.log("📂 جاري قراءة ملف الـ JSON...");
    const rawData = fs.readFileSync(JSON_FILE_PATH, "utf-8");
    const menuData = JSON.parse(rawData);

    if (!Array.isArray(menuData) || menuData.length === 0) {
      console.error("❌ ملف الـ JSON فارغ أو ليس بصيغة مصفوفة صحيحة.");
      process.exit(1);
    }

    console.log(`⏳ جاري بدء عملية الـ Bulk Insert لعدد ${menuData.length} قسم...`);

    console.time("⏱️ إجمالي وقت عملية الاستيراد");

    const result = await importMenuBulkService(RESTAURANT_ID, menuData);

    console.timeEnd("⏱️ إجمالي وقت عملية الاستيراد");

    console.log("✅ تمت عملية الاستيراد بنجاح!");
    console.log(`- الأقسام المضافة/المحدثة: ${result.categoriesProcessed}`);
    console.log(`- الأصناف المضافة/المحدثة: ${result.itemsProcessed}`);
  } catch (error: unknown) { 
    const msg: string = error instanceof Error ?  error.message : String(error)
    console.error("❌ حدث خطأ أثناء الاستيراد:", msg);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

runImport();