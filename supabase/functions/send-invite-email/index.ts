import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { email, orgName, inviterName, inviteToken } = await req.json()

    const siteUrl = Deno.env.get('SITE_URL') || 'https://teamer-two.vercel.app'
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) return new Response(JSON.stringify({ error: 'RESEND_API_KEY not set' }), { status: 500, headers: corsHeaders })

    const inviteUrl = `${siteUrl}/invite?token=${inviteToken}`

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
      <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
          <tr><td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background:#4f52e4;padding:28px 32px;">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="background:rgba(255,255,255,0.2);border-radius:10px;width:40px;height:40px;text-align:center;vertical-align:middle;">
                        <span style="color:#fff;font-weight:700;font-size:18px;">T</span>
                      </td>
                      <td style="padding-left:12px;color:#fff;font-weight:700;font-size:18px;letter-spacing:-0.3px;">Teamer</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding:32px;">
                  <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.3px;">You're invited!</p>
                  <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.5;">
                    <strong style="color:#111827;">${inviterName}</strong> has invited you to join
                    <strong style="color:#111827;"> ${orgName}</strong> on Teamer — a workspace for your team to assign tasks, share announcements, and stay in sync.
                  </p>
                  <a href="${inviteUrl}"
                    style="display:inline-block;background:#4f52e4;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:600;font-size:14px;">
                    Accept invite &rarr;
                  </a>
                  <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;line-height:1.6;">
                    Or copy this link: <a href="${inviteUrl}" style="color:#4f52e4;">${inviteUrl}</a><br>
                    This invite link will expire once used. If you didn't expect this, you can ignore this email.
                  </p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="padding:16px 32px;border-top:1px solid #f3f4f6;">
                  <p style="margin:0;font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} Teamer</p>
                </td>
              </tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `Teamer <onboarding@resend.dev>`,
        to: email,
        subject: `${inviterName} invited you to join ${orgName} on Teamer`,
        html,
      }),
    })

    const result = await res.json()
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders })
  }
})
