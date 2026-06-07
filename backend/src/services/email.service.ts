import type { Attachment } from "nodemailer/lib/mailer";
import nodemailer, { Transporter } from "nodemailer";
import { env } from "../config/env";

let transporter: Transporter | null = null;

const INTRUDER_PHOTO_CID = "ns_intruder_photo";

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: env.GMAIL_USER,
        pass: env.GMAIL_APP_PASSWORD,
      },
    });
  }
  return transporter;
}

export interface AlertEmailData {
  alertId: string;
  triggeredAt: Date;
  tabUrl?: string | null;
  intruderPhoto?: string | null; // data URL or http(s) URL
  userEmail: string;
}

function formatDate(d: Date): string {
  return d.toLocaleString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function parseDataUrl(
  dataUrl: string
): { mime: string; buffer: Buffer } | null {
  const trimmed = dataUrl.trim();
  const dataMatch = /^data:([\w/.+-]+);base64,(.+)$/is.exec(trimmed);
  if (!dataMatch) return null;
  try {
    return {
      mime: dataMatch[1] || "image/jpeg",
      buffer: Buffer.from(dataMatch[2].replace(/\s+/g, ""), "base64"),
    };
  } catch {
    return null;
  }
}

function buildAttachments(
  intruderPhoto: string | undefined | null
): { attachments: Attachment[]; imgHtml: string } {
  const noPhotoHtml = `<div style="margin:24px 0;padding:20px;text-align:center;border:1px dashed #E2E8F0;border-radius:16px;color:#64748B;font-size:13px;">
         No photo captured
       </div>`;

  if (!intruderPhoto || intruderPhoto.length < 12) {
    return { attachments: [], imgHtml: noPhotoHtml };
  }

  if (/^https?:\/\//i.test(intruderPhoto)) {
    const safe = intruderPhoto.replace(/"/g, "&quot;");
    const imgHtml = `<div style="margin:24px 0;text-align:center;">
         <img src="${safe}" alt="Intruder snapshot"
              style="max-width:100%;border-radius:16px;border:1px solid #E2E8F0;"/>
       </div>`;
    return { attachments: [], imgHtml };
  }

  const parsed = parseDataUrl(intruderPhoto);
  if (!parsed || parsed.buffer.length === 0) {
    return { attachments: [], imgHtml: noPhotoHtml };
  }

  const attachments: Attachment[] = [
    {
      filename: "intruder-snapshot.jpg",
      content: parsed.buffer,
      contentType: parsed.mime,
      cid: INTRUDER_PHOTO_CID,
    },
  ];
  const imgHtml = `<div style="margin:24px 0;text-align:center;">
         <img src="cid:${INTRUDER_PHOTO_CID}" alt="Intruder snapshot"
              style="max-width:100%;border-radius:16px;border:1px solid #E2E8F0;"/>
       </div>
       <p style="margin:8px 0 0;color:#64748B;font-size:11px;">If you do not see the image inside the email, check for &quot;display images&quot; in your inbox.</p>`;
  return { attachments, imgHtml };
}

function buildHtml(data: AlertEmailData, imgHtml: string): string {
  const tabBlock = data.tabUrl
    ? `<tr>
         <td style="padding:12px 0;color:#64748B;font-size:13px;width:120px;">Active tab</td>
         <td style="padding:12px 0;color:#0F172A;font-size:14px;word-break:break-all;">
           <a href="${data.tabUrl}" style="color:#6366F1;text-decoration:none;">${data.tabUrl}</a>
         </td>
       </tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>NeuroSecure Alert</title>
</head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:'Inter','Segoe UI',Helvetica,Arial,sans-serif;color:#0F172A;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:24px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">

      <div style="padding:24px 28px;background:linear-gradient(135deg,#6366F1,#4F46E5);color:#fff;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:42px;height:42px;border-radius:12px;background:rgba(255,255,255,0.18);display:inline-flex;align-items:center;justify-content:center;font-size:22px;">🛡️</div>
          <div>
            <div style="font-size:18px;font-weight:700;letter-spacing:-0.01em;">NeuroSecure</div>
            <div style="font-size:12px;opacity:0.85;">Privacy Protection</div>
          </div>
        </div>
      </div>

      <div style="padding:28px;">
        <div style="display:inline-block;padding:6px 12px;background:#FEE2E2;color:#B91C1C;border-radius:999px;font-size:12px;font-weight:600;margin-bottom:16px;">
          🚨 Security Alert
        </div>
        <h1 style="margin:0 0 8px 0;font-size:22px;font-weight:700;letter-spacing:-0.01em;">
          Unknown face detected
        </h1>
        <p style="margin:0 0 16px 0;color:#64748B;font-size:14px;line-height:1.55;">
          NeuroSecure detected an unauthorized viewer on your screen and activated
          protection automatically. Review the details below.
        </p>

        ${imgHtml}

        <table style="width:100%;border-collapse:collapse;border-top:1px solid #E2E8F0;">
          <tr>
            <td style="padding:12px 0;color:#64748B;font-size:13px;width:120px;">Alert ID</td>
            <td style="padding:12px 0;color:#0F172A;font-size:14px;font-family:'SFMono-Regular',Menlo,Consolas,monospace;">${data.alertId}</td>
          </tr>
          <tr>
            <td style="padding:12px 0;color:#64748B;font-size:13px;width:120px;">Time</td>
            <td style="padding:12px 0;color:#0F172A;font-size:14px;">${formatDate(data.triggeredAt)}</td>
          </tr>
          <tr>
            <td style="padding:12px 0;color:#64748B;font-size:13px;width:120px;">Account</td>
            <td style="padding:12px 0;color:#0F172A;font-size:14px;">${data.userEmail}</td>
          </tr>
          ${tabBlock}
        </table>

        <div style="margin-top:24px;padding:16px;background:#EEF2FF;border:1px solid #C7D2FE;border-radius:12px;color:#3730A3;font-size:13px;line-height:1.55;">
          <strong style="color:#312E81;">Tip:</strong> If you recognize this person,
          you can disable detection from the NeuroSecure popup. Otherwise, change
          your password and review recent activity on your accounts.
        </div>
      </div>

      <div style="padding:18px 28px;background:#F8FAFC;border-top:1px solid #E2E8F0;color:#94A3B8;font-size:12px;text-align:center;">
        Sent by NeuroSecure · AI-powered browser privacy protection
      </div>
    </div>
  </div>
</body>
</html>`;
}

export const emailService = {
  async sendAlertEmail(
    to: string | string[],
    data: AlertEmailData
  ): Promise<void> {
    const { attachments, imgHtml } = buildAttachments(data.intruderPhoto);
    const html = buildHtml(data, imgHtml);
    const transport = getTransporter();
    await transport.sendMail({
      from: `"NeuroSecure" <${env.GMAIL_USER}>`,
      to,
      subject: "🚨 NeuroSecure Alert — Unknown Face Detected",
      html,
      text: `NeuroSecure Alert
Unknown face detected at ${formatDate(data.triggeredAt)}
Account: ${data.userEmail}
${data.tabUrl ? `Tab: ${data.tabUrl}` : ""}
Alert ID: ${data.alertId}

${attachments.length ? "A snapshot image is attached (intruder-snapshot.jpg).\n" : ""}
`,
      attachments,
    });
  },

  async verify(): Promise<boolean> {
    try {
      await getTransporter().verify();
      return true;
    } catch (err) {
      console.error("[email.service] SMTP verification failed:", err);
      return false;
    }
  },
};
