import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { Activity, ChartNoAxesCombined, LoaderCircle, LockKeyhole, LogOut, Mail, ShieldCheck, ShieldX } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type Access = 'checking' | 'signed-out' | 'admin'

export default function AuthGate({ children }: { children: ReactNode }) {
  const [introComplete, setIntroComplete] = useState(false)
  const [access, setAccess] = useState<Access>('checking')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [adminEmail, setAdminEmail] = useState('')
  const reduceMotion = useReducedMotion()
  const finishIntro = useCallback(() => setIntroComplete(true), [])

  useEffect(() => {
    const client = supabase
    if (!client) { setAccess('signed-out'); return }
    let mounted = true
    let sequence = 0

    const verifyAdmin = async (user: User | null) => {
      const current = ++sequence
      if (!mounted) return
      if (!user) { setAccess('signed-out'); setAdminEmail(''); return }
      setAccess('checking')

      const { data: profile, error } = await client.from('user_profiles')
        .select('id,role,is_active').eq('id', user.id).maybeSingle()
      if (!mounted || current !== sequence) return
      if (error) {
        setErrorMessage('Tidak bisa memeriksa jenis akun. Pastikan kebijakan baca profil sudah dipasang di Supabase.')
        setAccess('signed-out')
        await client.auth.signOut()
        return
      }

      if (profile?.is_active !== true || profile.role?.trim().toLowerCase() !== 'admin') {
        setErrorMessage('Akun ini tidak memiliki akses admin aktif.')
        setAccess('signed-out')
        await client.auth.signOut()
        return
      }

      setAdminEmail(user.email ?? '')
      setErrorMessage('')
      setAccess('admin')
    }

    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => { void verifyAdmin(session?.user ?? null) }, 0)
    })
    void client.auth.getSession().then(({ data, error }) => {
      if (error) {
        if (mounted) { setErrorMessage('Sesi tidak dapat dibaca. Coba masuk kembali.'); setAccess('signed-out') }
        return
      }
      void verifyAdmin(data.session?.user ?? null)
    })
    return () => { mounted = false; listener.subscription.unsubscribe() }
  }, [])

  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) return
    setBusy(true)
    setErrorMessage('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    setPassword('')
    if (error) setErrorMessage('Email atau kata sandi tidak cocok. Periksa kembali lalu coba lagi.')
  }

  const logout = async () => {
    if (!supabase) return
    setBusy(true)
    await supabase.auth.signOut()
    setPassword('')
    setBusy(false)
  }

  if (!introComplete) return <SplashScreen reduceMotion={Boolean(reduceMotion)} onDone={finishIntro}/>

  if (access === 'checking') return (
    <main className="grid min-h-dvh place-items-center bg-[#FFFFFF] px-4 pt-[max(24px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))]">
      <section className="w-full max-w-[420px] rounded-[22px] border border-[#e4ded3] bg-white p-6 shadow-2xl shadow-[#3f4a37]/10" aria-live="polite">
        <BrandMark/><LoaderCircle className="mb-3 animate-spin text-[#365a42]" size={19}/><h1 className="font-display text-2xl font-medium tracking-tight">Memeriksa akses…</h1><p className="mt-2 text-xs leading-relaxed text-[#73796f]">Menyiapkan sesi owner dengan aman.</p>
      </section>
    </main>
  )

  if (access === 'admin') return <>
    <header className="flex min-h-10 w-full items-center justify-between gap-2 border-b border-[#dce8de] bg-[#edf1e9] px-4 py-[max(7px,env(safe-area-inset-top))] text-[10px] text-[#34463a]">
      <span className="flex min-w-0 items-center gap-2"><ShieldCheck size={16} className="shrink-0"/><span className="truncate">Admin aktif{adminEmail ? ` · ${adminEmail}` : ''}</span></span>
      <button type="button" onClick={() => void logout()} disabled={busy} className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-[#34463a] hover:bg-white/5 disabled:opacity-50"><LogOut size={15}/> Keluar</button>
    </header>
    {children}
  </>

  return (
    <main className="grid min-h-dvh place-items-center bg-[#FFFFFF] px-4 pt-[max(24px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))]">
      <section className="w-full max-w-[420px] rounded-[22px] border border-[#e4ded3] bg-white p-6 shadow-2xl shadow-[#3f4a37]/10" aria-labelledby="login-title">
        <BrandMark/>
        <p className="mb-2 text-[10px] font-bold tracking-[.15em] text-[#73796f]">HEBBUNA · OWNER MONITOR</p>
        <h1 id="login-title" className="font-display text-[28px] font-medium tracking-tight text-[#28352c]">Masuk sebagai admin</h1>
        <p className="mb-5 mt-2 text-xs leading-relaxed text-[#73796f]">Gunakan akun admin yang sudah terdaftar dan aktif. Akun pegawai tidak dapat membuka aplikasi ini.</p>

        {!isSupabaseConfigured && <Message>Supabase belum diatur. Salin .env.example menjadi .env, isi URL dan public key, lalu mulai ulang Vite.</Message>}
        {errorMessage && <Message role="alert">{errorMessage}</Message>}

        <form className="grid gap-2" onSubmit={submitLogin}>
          <label htmlFor="login-email" className="mt-1 text-[10px] font-semibold text-[#4e594f]">Email</label>
          <div className="flex h-11 items-center gap-2.5 rounded-xl border border-[#e4ded3] bg-[#f8f5ee] px-3 text-[#73796f] transition focus-within:border-[#6b8662] focus-within:ring-2 focus-within:ring-[#365a42]/10"><Mail size={16}/><input id="login-email" type="email" autoComplete="username" inputMode="email" maxLength={254} required value={email} onChange={event => setEmail(event.target.value)} disabled={!isSupabaseConfigured || busy} className="w-full min-w-0 bg-transparent text-[11px] text-[#28352c] outline-none placeholder:text-[#73796f] disabled:opacity-50" placeholder="email admin"/></div>
          <label htmlFor="login-password" className="mt-1 text-[10px] font-semibold text-[#4e594f]">Kata sandi</label>
          <div className="flex h-11 items-center gap-2.5 rounded-xl border border-[#e4ded3] bg-[#f8f5ee] px-3 text-[#73796f] transition focus-within:border-[#6b8662] focus-within:ring-2 focus-within:ring-[#365a42]/10"><LockKeyhole size={16}/><input id="login-password" type="password" autoComplete="current-password" maxLength={128} required value={password} onChange={event => setPassword(event.target.value)} disabled={!isSupabaseConfigured || busy} className="w-full min-w-0 bg-transparent text-[11px] text-[#28352c] outline-none placeholder:text-[#73796f] disabled:opacity-50" placeholder="kata sandi"/></div>
          <button className="mt-2 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#617d59] px-4 text-[11px] font-bold text-[#fffdf8] transition hover:bg-[#78936d] disabled:cursor-not-allowed disabled:opacity-50" type="submit" disabled={!isSupabaseConfigured || busy}>{busy ? <><LoaderCircle size={16} className="animate-spin"/> Memeriksa…</> : 'Masuk'}</button>
        </form>
        <div className="mt-5 flex items-center gap-2 text-[10px] text-[#73796f]"><Activity size={14}/> Supabase Auth · akses dibatasi oleh role database</div>
      </section>
    </main>
  )
}

function SplashScreen({ reduceMotion, onDone }: { reduceMotion: boolean; onDone: () => void }) {
  const [leaving, setLeaving] = useState(false)
  useEffect(() => {
    const fadeTimer = window.setTimeout(() => setLeaving(true), reduceMotion ? 80 : 2450)
    const doneTimer = window.setTimeout(onDone, reduceMotion ? 100 : 2950)
    return () => { window.clearTimeout(fadeTimer); window.clearTimeout(doneTimer) }
  }, [onDone, reduceMotion])

  return <motion.main
    className="fixed inset-0 z-50 grid place-items-center overflow-hidden bg-white  px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
    initial={{ opacity: 0 }}
    animate={{ opacity: leaving ? 0 : 1 }}
    transition={{ duration: reduceMotion ? 0.08 : 0.48, ease: 'easeInOut' }}
    aria-label="Hebunna Owner Monitor sedang dibuka"
  >
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-32 left-1/2 size-80 -translate-x-1/2 rounded-full bg-[#dec48e]/[0.09] blur-[100px]" />
      <div className="absolute -bottom-40 left-1/2 size-96 -translate-x-1/2 rounded-full bg-[#dec48e]/[0.06] blur-[110px]" />
      <div className="absolute inset-x-8 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
    </div>

    <div className="relative z-10 flex w-full max-w-[380px] -translate-y-2 flex-col items-center">
      <div className="relative aspect-square w-[min(76vw,320px)] overflow-hidden rounded-[26px] border border-[#dec48e]/30 bg-[#fcfbf9] shadow-[0_28px_100px_rgba(222,196,142,0.12)]">
        <img
          src="/assets/hebbuna-splash.jpeg"
          alt="Logo Hebbuna"
          className={`h-full w-full object-cover ${reduceMotion ? 'opacity-100' : 'animate-splash-image'}`}
        />
        {!reduceMotion && <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-1/2 -translate-x-full bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-0 animate-splash-shimmer" />}
        {!reduceMotion && <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <rect x="1" y="1" width="98" height="98" rx="7" pathLength="100" fill="none" stroke="#dec48e" strokeWidth="0.65" strokeDasharray="100" strokeDashoffset="100" className="animate-splash-draw" />
        </svg>}
      </div>

      <div aria-hidden="true" className={`mt-9 h-px w-16 origin-center bg-gradient-to-r from-transparent via-[#dec48e] to-transparent opacity-0 ${reduceMotion ? 'opacity-100' : 'animate-splash-line'}`} />
      <p className={`mt-4 text-[10px] font-medium uppercase tracking-[0.34em] text-[#e8dcc1]/80 opacity-0 ${reduceMotion ? 'opacity-100' : 'animate-splash-subtitle'}`}>
        Hebbuna Store
      </p>
    </div>
  </motion.main>
}

function BrandMark() { return <div className="mb-6 grid size-[42px] place-items-center rounded-[14px] bg-[#e1e9dc] text-[#365a42]"><ChartNoAxesCombined size={22}/></div> }
function Message({ children, role }: { children: ReactNode; role?: 'alert' }) { return <div role={role} className="mb-3 flex items-start gap-2 rounded-xl border border-[#e8cbc4] bg-[#f4e4df] p-2.5 text-[10px] leading-relaxed text-[#8f3e36]"><ShieldX size={16} className="mt-0.5 shrink-0"/><span>{children}</span></div> }
