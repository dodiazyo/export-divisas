import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.APP_URL || 'http://localhost:5173';
const FROM    = 'DivisasPRO <noreply@divisaspro.com>';

/**
 * Envía el email de reset de contraseña
 */
export async function sendPasswordResetEmail({ toEmail, toName, token }) {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1e293b,#0f172a);padding:32px;text-align:center;border-bottom:1px solid #334155;">
            <div style="font-size:36px;margin-bottom:12px;">💱</div>
            <h1 style="color:#f8fafc;font-size:22px;font-weight:800;margin:0;letter-spacing:2px;">
              DIVISAS <span style="color:#d4a843;">PRO</span>
            </h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 32px;">
            <p style="color:#94a3b8;font-size:14px;margin:0 0 8px;">Hola, <strong style="color:#f1f5f9;">${toName || 'usuario'}</strong></p>
            <h2 style="color:#f1f5f9;font-size:20px;font-weight:700;margin:0 0 16px;">Restablecer contraseña</h2>
            <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 28px;">
              Recibimos una solicitud para restablecer la contraseña de tu cuenta.
              Haz clic en el botón para continuar. Este enlace expira en <strong style="color:#f1f5f9;">15 minutos</strong>.
            </p>

            <!-- Button -->
            <div style="text-align:center;margin-bottom:28px;">
              <a href="${resetUrl}"
                style="display:inline-block;background:linear-gradient(135deg,#d4a843,#f0c060);color:#0f172a;
                       text-decoration:none;font-weight:900;font-size:15px;padding:14px 36px;
                       border-radius:10px;letter-spacing:1px;">
                🔐 Restablecer contraseña
              </a>
            </div>

            <!-- Fallback URL -->
            <div style="background:#0f172a;border-radius:8px;padding:14px 16px;margin-bottom:24px;">
              <p style="color:#64748b;font-size:11px;margin:0 0 6px;text-transform:uppercase;letter-spacing:1px;">O copia este enlace en tu navegador:</p>
              <p style="color:#d4a843;font-size:12px;margin:0;word-break:break-all;font-family:monospace;">${resetUrl}</p>
            </div>

            <p style="color:#475569;font-size:12px;margin:0;">
              Si no solicitaste este cambio, puedes ignorar este correo. Tu contraseña no cambiará.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0f172a;padding:20px 32px;text-align:center;border-top:1px solid #1e293b;">
            <p style="color:#334155;font-size:11px;margin:0;">
              DivisasPRO · Sistema de Gestión de Casas de Cambio
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const result = await resend.emails.send({
      from: FROM,
      to:   [toEmail],
      subject: '🔐 Restablecer contraseña — DivisasPRO',
      html,
    });
    console.log(`[email] Reset enviado a ${toEmail}`, result?.id);
    return { ok: true };
  } catch (err) {
    console.error('[email] Error enviando reset:', err?.message);
    throw new Error('No se pudo enviar el correo. Intente más tarde.');
  }
}
