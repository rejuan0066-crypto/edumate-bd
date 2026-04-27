// Shared SMTP sender (works with Mailtrap and other STARTTLS SMTP providers).
// Reads credentials from the `smtp_config` table.

export interface SmtpConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  from_email: string;
  from_name?: string;
  use_tls?: boolean;
  is_enabled?: boolean;
}

export async function sendViaSMTP(
  smtpConfig: SmtpConfig,
  to: string,
  subject: string,
  htmlBody: string,
) {
  const { smtp_host, smtp_port, smtp_username, smtp_password, from_email, from_name, use_tls } = smtpConfig;

  const conn = await Deno.connect({ hostname: smtp_host, port: smtp_port || 587 });
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const buf = new Uint8Array(4096);

  const readResponse = async () => {
    const n = await conn.read(buf);
    return decoder.decode(buf.subarray(0, n || 0));
  };
  const sendCommand = async (cmd: string) => {
    await conn.write(encoder.encode(cmd + "\r\n"));
    return await readResponse();
  };

  await readResponse();
  await sendCommand("EHLO localhost");

  if (use_tls) {
    const starttls = await sendCommand("STARTTLS");
    if (starttls.startsWith("220")) {
      const tlsConn = await Deno.startTls(conn, { hostname: smtp_host });
      const readTls = async () => {
        const b = new Uint8Array(4096);
        const n = await tlsConn.read(b);
        return decoder.decode(b.subarray(0, n || 0));
      };
      const sendTls = async (cmd: string) => {
        await tlsConn.write(encoder.encode(cmd + "\r\n"));
        return await readTls();
      };

      await sendTls("EHLO localhost");
      await sendTls("AUTH LOGIN");
      await sendTls(btoa(smtp_username));
      const authResp = await sendTls(btoa(smtp_password));
      if (!authResp.startsWith("235")) {
        try { tlsConn.close(); } catch (_) {}
        throw new Error("SMTP authentication failed");
      }

      const fromHeader = from_name ? `"${from_name}" <${from_email}>` : from_email;
      await sendTls(`MAIL FROM:<${from_email}>`);
      await sendTls(`RCPT TO:<${to}>`);
      await sendTls("DATA");

      const message = [
        `From: ${fromHeader}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: text/html; charset=UTF-8`,
        ``,
        htmlBody,
        `.`,
      ].join("\r\n");

      const dataResp = await sendTls(message);
      await sendTls("QUIT");
      try { tlsConn.close(); } catch (_) {}
      if (!dataResp.startsWith("250")) throw new Error("Failed to send email: " + dataResp);
      return true;
    }
  }

  await sendCommand("AUTH LOGIN");
  await sendCommand(btoa(smtp_username));
  const authResp = await sendCommand(btoa(smtp_password));
  if (!authResp.startsWith("235")) {
    try { conn.close(); } catch (_) {}
    throw new Error("SMTP authentication failed");
  }

  const fromHeader = from_name ? `"${from_name}" <${from_email}>` : from_email;
  await sendCommand(`MAIL FROM:<${from_email}>`);
  await sendCommand(`RCPT TO:<${to}>`);
  await sendCommand("DATA");
  const message = [
    `From: ${fromHeader}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=UTF-8`,
    ``,
    htmlBody,
    `.`,
  ].join("\r\n");
  const dataResp = await sendCommand(message);
  await sendCommand("QUIT");
  try { conn.close(); } catch (_) {}
  if (!dataResp.startsWith("250")) throw new Error("Failed to send email: " + dataResp);
  return true;
}

export function welcomeEmailHtml(opts: {
  fullName?: string;
  role?: string;
  email: string;
  password?: string;
  loginUrl?: string;
  brandName?: string;
  kind: 'user' | 'student';
  studentId?: string;
}) {
  const brand = opts.brandName || 'School Management';
  const greetingName = opts.fullName || opts.email;
  const isStudent = opts.kind === 'student';
  const titleEn = isStudent ? 'Welcome — Admission Confirmed' : 'Welcome — Account Created';
  const titleBn = isStudent ? 'স্বাগতম — ভর্তি নিশ্চিত' : 'স্বাগতম — অ্যাকাউন্ট তৈরি হয়েছে';

  const credBlock = opts.password
    ? `
      <div style="background:#f0faf6;border:1px solid #cdeadd;border-radius:12px;padding:16px;margin:16px 0;">
        <p style="margin:0 0 8px;font-size:13px;color:#1a7f64;font-weight:600;">Login Credentials / লগইন তথ্য</p>
        <p style="margin:4px 0;font-size:14px;color:#333;"><strong>Email:</strong> ${opts.email}</p>
        <p style="margin:4px 0;font-size:14px;color:#333;"><strong>Password:</strong> <code style="background:#fff;padding:2px 6px;border-radius:4px;">${opts.password}</code></p>
        <p style="margin:8px 0 0;font-size:11px;color:#888;">Please change your password after first login. / প্রথম লগইনের পর পাসওয়ার্ড পরিবর্তন করুন।</p>
      </div>`
    : '';

  const studentBlock = opts.studentId
    ? `<p style="margin:6px 0;font-size:14px;color:#333;"><strong>Student ID:</strong> ${opts.studentId}</p>`
    : '';

  const ctaBlock = opts.loginUrl
    ? `<a href="${opts.loginUrl}" style="display:inline-block;background:#1a7f64;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin-top:8px;">Open Portal</a>`
    : '';

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#1a7f64,#2da882);padding:28px 24px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:20px;">${brand}</h1>
      <p style="color:#d4f5e9;margin:6px 0 0;font-size:13px;">${titleEn} • ${titleBn}</p>
    </div>
    <div style="padding:28px 24px;color:#333;font-size:15px;line-height:1.6;">
      <p style="margin:0 0 12px;">Hello <strong>${greetingName}</strong>,</p>
      <p style="margin:0 0 12px;">${isStudent
        ? `Your admission to <strong>${brand}</strong> has been confirmed. We're excited to have you on board!`
        : `An account has been created for you on <strong>${brand}</strong>${opts.role ? ` with the role <strong>${opts.role}</strong>` : ''}.`}</p>
      ${studentBlock}
      ${credBlock}
      <p style="margin:16px 0 4px;font-size:13px;color:#666;">${isStudent
        ? 'আপনার ভর্তি সফলভাবে সম্পন্ন হয়েছে। বিস্তারিত তথ্যের জন্য প্রতিষ্ঠানে যোগাযোগ করুন।'
        : 'আপনার অ্যাকাউন্ট তৈরি হয়েছে। অনুগ্রহ করে নিচের লিংক থেকে লগইন করুন।'}</p>
      <div style="text-align:center;margin-top:18px;">${ctaBlock}</div>
    </div>
    <div style="background:#f9fafb;padding:14px 24px;text-align:center;border-top:1px solid #eee;">
      <p style="color:#aaa;font-size:11px;margin:0;">${brand} • This is an automated message.</p>
    </div>
  </div>
</body></html>`;
}
