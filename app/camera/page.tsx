// app/camera/page.tsx — Photo upload + daily record creation
// Protected route: middleware redirects unauthenticated users to /auth/login
'use client'

import { Suspense, useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { IconArrowLeft, IconCamera, IconPhoto, IconLoader2, IconCheck, IconX } from '@tabler/icons-react'
import { format } from 'date-fns'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase'
import type { Pot } from '@/lib/types'

// ── Image resize helper (adapted from legacy upload page) ─────────────────────
async function resizeImage(file: File, maxWidth: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const canvas = document.createElement('canvas')
      let w = img.width, h = img.height
      if (w > maxWidth) { h = Math.round((h * maxWidth) / w); w = maxWidth }
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas context unavailable')); return }
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Blob conversion failed')),
        file.type || 'image/jpeg', 0.85
      )
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = objectUrl
  })
}

function potEmoji(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('rose'))      return '🌹'
  if (n.includes('basil'))     return '🌿'
  if (n.includes('succulent')) return '🌵'
  if (n.includes('jasmine'))   return '🌸'
  if (n.includes('mint'))      return '🌱'
  if (n.includes('sunflower')) return '🌻'
  if (n.includes('lavender'))  return '💜'
  if (n.includes('tomato'))    return '🍅'
  if (n.includes('cactus'))    return '🌵'
  if (n.includes('fern'))      return '🌿'
  return '🪴'
}

type UploadStatus = 'idle' | 'uploading' | 'done' | 'error'

// Inner component holds all logic that calls useSearchParams()
// Must be wrapped in <Suspense> to satisfy Next.js 14 static-render requirements
function CameraPageInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const preFill      = searchParams.get('pot')         // pre-select a pot

  const fileInputRef    = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const [userId, setUserId]       = useState<string | null>(null)
  const [pots,   setPots]         = useState<Pot[]>([])
  const [potId,  setPotId]        = useState<string>('')
  const [file,   setFile]         = useState<File | null>(null)
  const [preview, setPreview]     = useState<string | null>(null)
  const [caption, setCaption]     = useState('')
  const [publishPost, setPublish] = useState(false)
  const [status, setStatus]       = useState<UploadStatus>('idle')
  const [errorMsg, setErrorMsg]   = useState('')

  // Load user + their pots on mount — all via authenticated browser client
  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    supabase.auth.getUser().then(({ data: { user } }: { data: { user: import('@supabase/supabase-js').User | null } }) => {
      if (!user) { router.replace('/auth/login?next=/camera'); return }
      setUserId(user.id)
      // Use the same authenticated client so RLS SELECT policies pass
      supabase
        .from('pots')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .then(({ data }: { data: Pot[] | null }) => {
          const list = data ?? []
          setPots(list)
          if (list.length > 0) {
            const match = preFill ? list.find(p => p.id === preFill) : null
            setPotId(match?.id ?? list[0].id)
          }
        })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (!selected) return
    setFile(selected)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(URL.createObjectURL(selected))
    setStatus('idle')
    setErrorMsg('')
  }

  async function handleUpload() {
    if (!file || !potId) return
    setStatus('uploading')
    setErrorMsg('')

    try {
      // ── Step 1: obtain the live session token ────────────────────────────
      // We use the SSR browser client only to read the session.  The token it
      // returns was set by Supabase Auth when the user signed in and is stored
      // in the browser cookie.  We don't rely on the client itself having a
      // valid auth context for database calls — we inject the token explicitly
      // in step 2 instead.
      const sbrClient = createSupabaseBrowserClient()
      const { data: { session } } = await sbrClient.auth.getSession()
      if (!session) throw new Error('Please sign in to upload.')
      const user = session.user

      // ── Step 2: create a plain supabase-js client with the JWT baked in ─
      // Passing Authorization: Bearer <access_token> as a global header means
      // Supabase always sees auth.uid() = user.id on the server — no cookie
      // detection, no singleton race, no SSR/browser ambiguity.
      const supabase = createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        { global: { headers: { Authorization: `Bearer ${session.access_token}` } } }
      )

      const today    = format(new Date(), 'yyyy-MM-dd')
      const blob     = await resizeImage(file, 1200)
      const safeFile = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path     = `${potId}/${today}_${safeFile}`

      // ── Storage upload ───────────────────────────────────────────────────
      const { error: storErr } = await supabase.storage
        .from('photos')
        .upload(path, blob, { contentType: file.type || 'image/jpeg', upsert: true })
      if (storErr) throw new Error(storErr.message)

      const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path)

      // ── DB write ─────────────────────────────────────────────────────────
      // Always INSERT a new row — the UNIQUE(pot_id, record_date) constraint
      // has been removed (see supabase/migrations/001_remove_unique_constraint.sql).
      // Multiple uploads on the same day each become an independent record.
      // The timeline groups by date client-side and shows the latest as cover.
      const { error: dbErr } = await supabase
        .from('daily_records')
        .insert({
          user_id:     user.id,
          user_name:   user.id,
          pot_id:      potId,
          record_date: today,
          image_url:   publicUrl,
          ...(caption.trim() && { caption: caption.trim() }),
          has_post:    publishPost,
        })
      if (dbErr) throw new Error(dbErr.message)

      setStatus('done')
      setTimeout(() => {
        router.push(`/timeline?pot=${encodeURIComponent(potId)}`)
      }, 1200)

    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed')
      setStatus('error')
    }
  }

  const selectedPot = pots.find(p => p.id === potId)
  const canUpload   = Boolean(file && potId && status !== 'uploading' && status !== 'done')

  return (
    <div style={{
      maxWidth: 480, margin: '0 auto', minHeight: '100vh',
      background: 'var(--bg-base)', fontFamily: 'var(--font-sans)',
      paddingBottom: 40,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '16px 16px 10px',
        borderBottom: '0.5px solid var(--border-subtle)',
      }}>
        <button onClick={() => router.back()} style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'var(--glass-sage-light)', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--sage-700)',
        }}>
          <IconArrowLeft size={18} strokeWidth={1.75} />
        </button>
        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--sage-900)' }}>
          Record Today
        </span>
      </div>

      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Pot selector ────────────────────────────────────────────────── */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--sage-700)', display: 'block', marginBottom: 8 }}>
            Which plant?
          </label>
          {pots.length === 0 ? (
            <div style={{
              padding: '14px 16px', background: 'var(--bg-card)',
              border: '0.5px solid var(--border-default)', borderRadius: 12,
              fontSize: 13, color: 'var(--sage-400)',
            }}>
              No pots yet — add one in My Garden first.
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              {pots.map(pot => (
                <button key={pot.id} type="button" onClick={() => setPotId(pot.id)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer',
                    padding: '4px 2px',
                  }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%', fontSize: 24,
                    background: potId === pot.id ? 'var(--glass-sage-medium)' : 'var(--bg-card)',
                    border: potId === pot.id ? '1.5px solid var(--glass-sage-border)' : '0.5px solid var(--border-default)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: potId === pot.id ? 'var(--shadow-card-focus)' : 'none',
                    transition: 'all 0.15s',
                  }}>
                    {potEmoji(pot.name)}
                  </div>
                  <span style={{
                    fontSize: 9, color: potId === pot.id ? 'var(--sage-900)' : 'var(--sage-400)',
                    fontWeight: potId === pot.id ? 600 : 400, maxWidth: 52,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {pot.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Photo trigger buttons ─────────────────────────────────────── */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--sage-700)', display: 'block', marginBottom: 8 }}>
            Add photo
          </label>

          {/* Preview or placeholder */}
          {preview ? (
            <div style={{ position: 'relative', width: '100%', borderRadius: 12, overflow: 'hidden', marginBottom: 10 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Preview" style={{ width: '100%', display: 'block', maxHeight: 280, objectFit: 'cover' }} />
              <button onClick={() => { setFile(null); setPreview(null) }}
                style={{
                  position: 'absolute', top: 8, right: 8,
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'rgba(61,79,60,0.55)', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff',
                }}>
                <IconX size={14} strokeWidth={2} />
              </button>
            </div>
          ) : (
            <div style={{
              width: '100%', aspectRatio: '4/3', borderRadius: 12,
              background: 'var(--glass-sage-subtle)',
              border: '1px dashed var(--glass-sage-border)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 8, marginBottom: 10, color: 'var(--sage-400)',
            }}>
              <IconCamera size={32} strokeWidth={1.25} />
              <span style={{ fontSize: 12 }}>No photo yet</span>
            </div>
          )}

          {/* Two buttons: camera and gallery */}
          <div style={{ display: 'flex', gap: 8 }}>
            {/* Hidden camera input */}
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment"
              onChange={handleFileSelected} style={{ display: 'none' }} />
            {/* Hidden gallery input */}
            <input ref={galleryInputRef} type="file" accept="image/*"
              onChange={handleFileSelected} style={{ display: 'none' }} />

            <button type="button" onClick={() => fileInputRef.current?.click()}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
                background: 'var(--glass-sage-medium)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                fontSize: 12, fontWeight: 500, color: 'var(--sage-700)',
                fontFamily: 'var(--font-sans)',
              }}>
              <IconCamera size={15} strokeWidth={1.75} /> Take Photo
            </button>
            <button type="button" onClick={() => galleryInputRef.current?.click()}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 10,
                border: '0.5px solid var(--border-default)',
                background: 'var(--bg-card)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                fontSize: 12, fontWeight: 500, color: 'var(--sage-700)',
                fontFamily: 'var(--font-sans)',
              }}>
              <IconPhoto size={15} strokeWidth={1.75} /> Choose
            </button>
          </div>
        </div>

        {/* ── Caption ───────────────────────────────────────────────────── */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--sage-700)', display: 'block', marginBottom: 8 }}>
            Caption <span style={{ color: 'var(--sage-300)', fontWeight: 400 }}>(optional)</span>
          </label>
          <textarea
            value={caption} onChange={(e) => setCaption(e.target.value)}
            placeholder="How is it looking today?"
            rows={3} maxLength={500}
            style={{
              width: '100%', padding: '11px 14px',
              background: 'var(--bg-card)',
              border: '0.5px solid var(--border-default)',
              borderRadius: 10, fontSize: 13,
              color: 'var(--sage-700)', fontFamily: 'var(--font-sans)',
              resize: 'none', outline: 'none', boxSizing: 'border-box', lineHeight: 1.5,
            }}
          />
        </div>

        {/* ── Publish toggle ────────────────────────────────────────────── */}
        <label style={{
          display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
          padding: '13px 14px', background: 'var(--bg-card)',
          border: '0.5px solid var(--border-default)', borderRadius: 12,
        }}>
          <div style={{
            width: 40, height: 22, borderRadius: 11, position: 'relative',
            background: publishPost ? 'var(--success)' : 'var(--glass-sage-medium)',
            transition: 'background 0.2s', flexShrink: 0,
          }}>
            <div style={{
              position: 'absolute', top: 3, left: publishPost ? 21 : 3,
              width: 16, height: 16, borderRadius: '50%',
              background: '#fff', transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(61,79,60,0.2)',
            }} />
            <input type="checkbox" checked={publishPost} onChange={e => setPublish(e.target.checked)}
              style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer', margin: 0 }} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--sage-900)' }}>Publish as post</div>
            <div style={{ fontSize: 11, color: 'var(--sage-400)', marginTop: 1 }}>
              Visible to the community
            </div>
          </div>
        </label>

        {/* ── Error ─────────────────────────────────────────────────────── */}
        {status === 'error' && (
          <div style={{
            padding: '10px 14px', borderRadius: 10,
            background: 'rgba(226,75,74,0.07)', border: '0.5px solid rgba(226,75,74,0.3)',
            fontSize: 12, color: 'var(--danger)',
          }}>
            {errorMsg}
          </div>
        )}

        {/* ── Submit ────────────────────────────────────────────────────── */}
        <button
          type="button"
          onClick={handleUpload}
          disabled={!canUpload}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
            background: status === 'done'
              ? 'rgba(107,158,107,0.18)'
              : canUpload ? 'var(--glass-sage-strong)' : 'var(--glass-sage-medium)',
            color: status === 'done' ? 'var(--success)' : 'var(--sage-900)',
            fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-sans)',
            cursor: canUpload ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: !canUpload && status !== 'done' ? 0.6 : 1,
            transition: 'background 0.15s',
          }}>
          {status === 'uploading' && <IconLoader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />}
          {status === 'done'      && <IconCheck size={16} />}
          {status === 'uploading' ? 'Uploading…'
            : status === 'done'  ? `Saved! Returning to ${selectedPot?.name ?? 'timeline'}…`
            : 'Save Record'}
        </button>

      </div>
    </div>
  )
}

export default function CameraPage() {
  return (
    <Suspense fallback={
      <div style={{
        maxWidth: 480, margin: '0 auto', minHeight: '100vh',
        background: 'var(--bg-base)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        color: 'var(--sage-400)', fontFamily: 'var(--font-sans)', fontSize: 13,
      }}>
        Loading…
      </div>
    }>
      <CameraPageInner />
    </Suspense>
  )
}
