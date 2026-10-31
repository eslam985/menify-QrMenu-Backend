

const envOrigins: string[] = 
  process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()) : [];

const allowedOrigins: string[] = [...envOrigins];

// السماح بـ localhost في بيئة التطوير فقط
if (process.env.NODE_ENV !== "production") {
  allowedOrigins.push(
    "http://192.168.43.171:4173",
    "http://localhost:3000",
    "http://192.168.1.105:3000",
    "http://192.168.43.171:3000",
    "http://192.168.12.1:5173",
    "http://192.168.43.171:5173",
    "http://192.168.1.105:5173",
    "http://localhost:5173",
    "http://192.168.12.1:4173",
    "http://localhost:3001"
  );
  console.log(allowedOrigins);
}

export default allowedOrigins;
