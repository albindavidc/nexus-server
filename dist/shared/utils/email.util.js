"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOtpEmail = sendOtpEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const logger_1 = __importDefault(require("./logger"));
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});
async function sendOtpEmail(email, otp) {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    </head>
    <body style="margin:0;padding:0;background-color:#0D0D0D;font-family:'Helvetica Neue',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0D0D0D;padding:40px 20px;">
        <tr>
          <td align="center">
            <table width="420" cellpadding="0" cellspacing="0" style="background-color:#1E1E1E;border-radius:16px;border:1px solid #2A2A2A;overflow:hidden;">
              <!-- Header -->
              <tr>
                <td style="padding:32px 32px 24px;text-align:center;">
                  <div style="display:inline-block;background:linear-gradient(135deg,#FF5C1A,#FF9A5C);width:48px;height:48px;border-radius:12px;line-height:48px;text-align:center;font-size:24px;">
                    ⚡
                  </div>
                  <h1 style="color:#F5F5F5;font-size:32px;margin:16px 0 4px;letter-spacing:0.08em;font-weight:800;">NEXUS</h1>
                  <p style="color:#A0A0A0;font-size:12px;margin:0;letter-spacing:0.05em;">YOUR AI FITNESS COACH</p>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding:0 32px 24px;">
                  <p style="color:#F5F5F5;font-size:15px;margin:0 0 8px;font-weight:600;">Verify your email</p>
                  <p style="color:#A0A0A0;font-size:14px;margin:0 0 24px;line-height:1.5;">
                    Enter this code on the verification page to complete your registration. It expires in <strong style="color:#FF9A5C;">5 minutes</strong>.
                  </p>
                  <!-- OTP Code -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding:20px 0;">
                        <div style="display:inline-block;background:#111111;border:1px solid #2A2A2A;border-radius:12px;padding:16px 32px;letter-spacing:12px;font-size:32px;font-weight:800;color:#FF5C1A;font-family:'Courier New',monospace;">
                          ${otp}
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="padding:24px 32px;border-top:1px solid #2A2A2A;">
                  <p style="color:#5A5A5A;font-size:11px;margin:0;text-align:center;line-height:1.5;">
                    If you didn't create a Nexus account, you can safely ignore this email.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
    try {
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            logger_1.default.warn(`SMTP credentials missing. Bypassing email sending. OTP is: ${otp}`);
            return;
        }
        await transporter.sendMail({
            from: `"Nexus Fitness" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
            to: email,
            subject: "Your Nexus Verification Code",
            html,
        });
        logger_1.default.info(`OTP email sent to ${email}`);
    }
    catch (error) {
        logger_1.default.error(`Failed to send OTP email to ${email}:`, error);
        throw new Error("Failed to send verification email", { cause: error });
    }
}
