// src/utils/emailTemplates.ts
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}


/**
 * Returns the HTML body for the password-reset email.
 *
 * @param username  - The recipient's display name
 * @param otp       - The 6-digit OTP code (shown in the email)
 * @param expiresIn - Human-readable expiry string, e.g. "15 minutes"
 */
export function passwordResetEmailHtml(
  username: string,
  otp: string,
  expiresIn = "15 دقيقة",
): string {
  const safeUsername = escapeHtml(username);

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>إعادة تعيين كلمة المرور</title>
  <style>
    body { margin: 0; padding: 0; background: #f4f4f7; font-family: 'Segoe UI', Arial, sans-serif; direction: rtl; }
    .wrapper { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .header { background: #1a1a2e; padding: 32px 40px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }
    .header p { margin: 6px 0 0; color: #a0aec0; font-size: 13px; }
    .body { padding: 36px 40px; }
    .greeting { font-size: 16px; color: #2d3748; margin-bottom: 16px; }
    .description { font-size: 14px; color: #718096; line-height: 1.7; margin-bottom: 28px; }
    .otp-box { background: #f7f8fc; border: 2px dashed #e2e8f0; border-radius: 10px; padding: 20px; text-align: center; margin-bottom: 28px; }
    .otp-code { font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #1a1a2e; font-family: 'Courier New', monospace; }
    .otp-label { font-size: 12px; color: #a0aec0; margin-top: 6px; }
    .warning { background: #fff5f5; border-right: 4px solid #fc8181; border-radius: 6px; padding: 12px 16px; font-size: 13px; color: #c53030; margin-bottom: 24px; }
    .footer { background: #f7f8fc; padding: 20px 40px; text-align: center; font-size: 12px; color: #a0aec0; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="wrapper" dir="rtl" style="direction: rtl; text-align: right;">
    <div class="header">
      <h1>🔑 Tabloz</h1>
      <p>إعادة تعيين كلمة المرور</p>
    </div>
    <div class="body">
      <p class="greeting" dir="rtl" style="direction: rtl; text-align: right;">
        مرحباً، <bdi>${safeUsername}</bdi> 👋
      </p>
      <p class="description">
        تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك.
        استخدم الكود أدناه لإكمال العملية. إذا لم تطلب ذلك، يمكنك تجاهل هذا البريد بأمان.
      </p>

      <div class="otp-box">
        <div 
          class="otp-code" 
          style="user-select: all; -webkit-user-select: all; cursor: pointer;"
          title="اضغط لتحديد الكود"
        >${otp}</div>
        <div class="otp-label">رمز التحقق (صالح لمدة ${expiresIn}) — اضغط على الكود لتحديده</div>
      </div>


      <div class="warning">
        ⚠️ لا تشارك هذا الرمز مع أي شخص. فريق Tabloz لن يطلب منك هذا الرمز أبداً.
      </div>
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} Tabloz · جميع الحقوق محفوظة
    </div>
  </div>
</body>
</html>
  `.trim();
}
