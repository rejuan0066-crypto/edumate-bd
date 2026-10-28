// Shared SMTP sender (works with Mailtrap, Gmail, and other STARTTLS/SSL SMTP providers).
// Properly handles SMTP response codes at every stage and surfaces detailed errors.

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

type Conn = Deno.Conn | Deno.TlsConn;

async function readAll(conn: Conn): Promise<string> {
  // Read until we get a final SMTP line (NNN<space>...) or no more data.
  const decoder = new TextDecoder();
  let acc = "";
  const buf = new Uint8Array(4096);
  // Single read is usually enough for SMTP; loop a couple times to drain multi-line responses.
  for (let i = 0; i < 5; i++) {
    const n = await Promise.race([
      conn.read(buf),
      new Promise<number | null>((resolve) => setTimeout(() => resolve(null), 4000)),
    ]);
    if (n === null || n === 0 || n === undefined) break;
    acc += decoder.decode(buf.subarray(0, n));
    // SMTP final-line marker: "NNN " (space after code) at the start of any line
    if (/(^|\n)\d{3} /m.test(acc)) break;
  }
  return acc;
}

async function send(conn: Conn, cmd: string): Promise<string> {
  const encoder = new TextEncoder();
  await conn.write(encoder.encode(cmd + "\r\n"));
  return await readAll(conn);
}

function expect(resp: string, codes: string[], stage: string) {
  const code = resp.match(/(\d{3})/)?.[1];
  if (!code || !codes.includes(code)) {
    throw new Error(`SMTP ${stage} failed (got "${resp.trim().substring(0, 200)}")`);
  }
}

export async function sendViaSMTP(
  smtpConfig: SmtpConfig,
  to: string,
  subject: string,
  htmlBody: string,
) {
  const { smtp_host, smtp_port, smtp_username, smtp_password, from_email, from_name, use_tls } = smtpConfig;
  const port = smtp_port || 587;
  const wantTls = use_tls !== false;

  // Port 465 = implicit TLS; everything else = plain then optional STARTTLS
  let conn: Conn;
  if (port === 465) {
    conn = await Deno.connectTls({ hostname: smtp_host, port });
  } else {
    conn = await Deno.connect({ hostname: smtp_host, port });
  }

  try {
    const greeting = await readAll(conn);
    expect(greeting, ["220"], "greeting");

    let ehlo = await send(conn, "EHLO localhost");
    expect(ehlo, ["250"], "EHLO");

    // STARTTLS upgrade if not already TLS
    if (port !== 465 && wantTls) {
      const starttls = await send(conn, "STARTTLS");
      expect(starttls, ["220"], "STARTTLS");
      conn = await Deno.startTls(conn as Deno.TcpConn, { hostname: smtp_host });
      ehlo = await send(conn, "EHLO localhost");
      expect(ehlo, ["250"], "EHLO (post-TLS)");
    }

    // AUTH LOGIN
    const authStart = await send(conn, "AUTH LOGIN");
    expect(authStart, ["334"], "AUTH LOGIN");
    const userResp = await send(conn, btoa(smtp_username));
    expect(userResp, ["334"], "AUTH username");
    const passResp = await send(conn, btoa(smtp_password));
    expect(passResp, ["235"], "AUTH password");

    const fromHeader = from_name ? `"${from_name}" <${from_email}>` : from_email;
    const mailFrom = await send(conn, `MAIL FROM:<${from_email}>`);
    expect(mailFrom, ["250"], "MAIL FROM");
    const rcptTo = await send(conn, `RCPT TO:<${to}>`);
    expect(rcptTo, ["250", "251"], "RCPT TO");

    // DATA — must wait for 354 prompt BEFORE sending the body
    const dataPrompt = await send(conn, "DATA");
    expect(dataPrompt, ["354"], "DATA prompt");

    // Dot-stuffing: lines starting with '.' must be escaped to '..'
    const safeBody = htmlBody.replace(/\r?\n\./g, "\n..");
    const messageId = `<${crypto.randomUUID()}@${(from_email.split("@")[1] || "local")}>`;
    const dateStr = new Date().toUTCString();
    const message = [
      `From: ${fromHeader}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `Date: ${dateStr}`,
      `Message-ID: ${messageId}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: 8bit`,
      ``,
      safeBody,
      `.`,
    ].join("\r\n");

    const dataResp = await send(conn, message);
    expect(dataResp, ["250"], "DATA accept");

    try { await send(conn, "QUIT"); } catch (_) {}
    try { conn.close(); } catch (_) {}
    return true;
  } catch (e) {
    try { conn.close(); } catch (_) {}
    throw e;
  }
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
  const esc = (v?: string) => v == null ? v : String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
  opts = {
    ...opts,
    fullName: esc(opts.fullName), role: esc(opts.role), email: esc(opts.email) as string,
    password: esc(opts.password), brandName: esc(opts.brandName), studentId: esc(opts.studentId),
    loginUrl: opts.loginUrl && /^https?:\/\//i.test(opts.loginUrl) ? esc(opts.loginUrl) : undefined,
  };
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
