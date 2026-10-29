import multer from "multer";

const storage: multer.StorageEngine = multer.memoryStorage();

const upload: multer.Multer = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // حد أقصى 5 ميجابايت
});

export default upload;
