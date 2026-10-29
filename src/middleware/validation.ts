// src/middleware/validation.ts
import type { RequestHandler } from "express";
import { z, type ZodType } from "zod";

/** { "body.email": [...], "query.page": [...] }, keeps the field name */
const formatErrors = (error: z.ZodError): Record<string, string[]> => {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join(".") : "_";
    (out[key] ??= []).push(issue.message);
  }
  return out;
};

const validateRequest =
  (schema: ZodType): RequestHandler =>
  (req, res, next) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: "خطأ في البيانات المدخلة",
        errors: formatErrors(result.error),
      });
      return;
    }

    const data = result.data as {
      body?: unknown;
      query?: Record<string, unknown>;
      params?: Record<string, unknown>;
    };

    // body is a plain writable property
    if (data.body !== undefined) req.body = data.body;

    // Express 5: req.query is a read-only getter recomputed on every access,
    // so mutating it is lost. Parsed values live in res.locals.validated instead.
    res.locals.validated = { query: data.query ?? {}, params: data.params ?? {} };

    next();
  };

const validateFile =
  (schema: ZodType): RequestHandler =>
  (req, res, next) => {
    const result = schema.safeParse({ file: req.file });

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: "خطأ في الملف المرفوع",
        errors: formatErrors(result.error),
      });
      return;
    }
    next();
  };

export { validateRequest, validateFile };