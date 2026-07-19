import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

const VAPID_PUBLIC = process.env.VITE_VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || ''

webpush.setVapidDetails(
  'mailto:admin@tasq.app',
  VAPID_PUBLIC,
  VAPID_PRIVATE
)

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method === 'GET' && req.query?.debug === '1') {
    const crypto = await import('crypto')
    let keysMatch = null
    try {
      const dBuf = Buffer.from(VAPID_PRIVATE, 'base64url')
      const ecdh = crypto.createECDH('prime256v1')
      ecdh.setPrivateKey(dBuf)
      const derivedPub = ecdh.getPublicKey().toString('base64url')
      keysMatch = derivedPub === VAPID_PUBLIC
    } catch (e) {
      keysMatch = `ERROR: ${e.message}`
    }
    return res.status(200).json({
      publicKeyLength: VAPID_PUBLIC.length,
      publicKeyFirst10: VAPID_PUBLIC.slice(0, 10),
      publicKeyLast5: VAPID_PUBLIC.slice(-5),
      privateKeyLength: VAPID_PRIVATE.length,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasSupabaseUrl: !!process.env.VITE_SUPABASE_URL,
      keysMatch,
    })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const secret = req.headers['x-webhook-secret']
  if (secret !== process.env.PUSH_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const record = req.body?.record
  if (!record || !record.user_id) {
    return res.status(400).json({ error: 'Missing notification record' })
  }

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', record.user_id)

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  if (!subs || subs.length === 0) {
    return res.status(200).json({ sent: 0, reason: 'No subscriptions for this user' })
  }

  const payload = JSON.stringify({
    title: record.title || 'Tasq',
    body: record.body || '',
    url: record.link || '/',
    tag: record.type || undefined,
  })

  let sent = 0
  const errors = []
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth_key },
        },
        payload
      )
      sent++
    } catch (err) {
      console.error('Push send failed:', err.statusCode, err.body || err.message)
      errors.push({ statusCode: err.statusCode || null, message: err.body || err.message })
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id)
      }
    }
  }

  return res.status(200).json({ sent, total: subs.length, errors })
}
