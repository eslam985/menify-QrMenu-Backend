/**
 * Converts an array of objects to a CSV string.
 * @param data - The array of data to export.
 * @returns The CSV string ready for export.
 */
const convertToCSV = <T extends object>(data: T[]): string => {

  if (!Array.isArray(data) || data.length === 0) {
    return '';
  }

  // 1. استخراج أسماء الأعمدة (Headers) تلقائياً من مفاتيح أول كائن
  const headers: string[] = Object.keys(data[0] as Record<string, unknown>);

  // 2. بناء السطر الأول (العناوين)
  const csvRows: string[] = [headers.join(',')];

  // 3. تحويل كل كائن إلى سطر مفصول بفواصل
  for (const row of data) {
    const record = row as Record<string, unknown>;
    const values: string[] = headers.map(header => {
      const rawValue = record[header];
      let value: string;

      // إذا كانت القيمة فارغة أو غير معرفة
      if (rawValue === null || rawValue === undefined) {
        value = '';
      }
      // إذا كانت القيمة مصفوفة أو كائن (مثل تصنيفات الميديا Genres المدمجة في استعلامك)
      else if (typeof rawValue === 'object') {
        value = JSON.stringify(rawValue) ?? '';
      } 
      // إذا كانت القيمة نصية، نحولها لنص صريح
      else {
        value = String(rawValue);
      }

      // حماية ملف الـ CSV: لو النص يحتوي على فواصل أو سطر جديد، يجب تغليفه بعلامات تنصيص ""
      // ومضاعفة علامات التنصيص الداخلية لكي لا ينكسر ملف الـ Excel
      if (value.includes(',') || value.includes('\n') || value.includes('"')) {
        value = `"${value.replace(/"/g, '""')}"`;
      }

      return value;
    });

    csvRows.push(values.join(','));
  }

  // 4. دمج كل السطور مع إضافة سطر جديد ونقل البيانات بترميز UTF-8
  // إضافة BOM (\ufeff) في بداية الملف لتجبر برنامج Excel على قراءة الحروف العربية بشكل صحيح دون رموز غريبة
  return '\ufeff' + csvRows.join('\n');
};

export default convertToCSV