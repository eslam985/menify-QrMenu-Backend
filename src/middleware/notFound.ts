// middleware/notFound.js
import type { RequestHandler } from "express";


const notFound: RequestHandler = (req, res, _next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });

};

export default notFound;
