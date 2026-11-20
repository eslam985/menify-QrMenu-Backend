// src/config/mailer.ts
import { CustomError } from "#src/utils/customErr.js";
import nodemailer from "nodemailer";

/**
 * Single shared transporter.
 * Reads credentials from env at import time (after dotenv/config in server.ts).
 *
 * Required env vars:
 *   EMAIL_USER   – Gmail address (e.g. you@gmail.com)
 *   EMAIL_PASS   – Gmail App Password (NOT your Gmail login password).
 *                  Generate one at: Google Account → Security → App Passwords
 */
if(!process.env.EMAIL_USER || !process.env.EMAIL_PASS )
  throw new CustomError('EMAIL_USER or EMAIL_PASS is required!', 500)

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export default transporter;
 