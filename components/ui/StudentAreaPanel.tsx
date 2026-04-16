'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Bot, CheckCircle2, Crown, LockKeyhole, Mail, MessageSquare, ShieldCheck, Sparkles, UserRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getSearchLimits, normalizePlanTier, type PlanTier } from '@/lib/search-plans'
import type { Profile } from '@/types/database'

type UserSnapshot = {
  id: string
  email: string
  createdAt?: string
  lastSignInAt?: string | null
}

type UsageSnapshot = {
  alto_busca_count: number
  advanced_busca_count: number
}

type StatsSnapshot = {
  sessionsCount: number
  flashcardsCount: number
  answersCount: number
}

type Notice = {
  tone: 'success' | 'error' | 'neutral'
  text: string
} | null

type StudentAreaPanelProps = {
  user: UserSnapshot
  initialProfile: Profile | null
  initialUsage: UsageSnapshot
  stats: StatsSnapshot
  profileCompletion: number
  normalizedPlan: PlanTier
}

function getPlanLabel(plan: PlanTier) {
  if (plan === 'premium') return 'Premium'
  if (plan === 'basico') return 'Basico'
  return 'Gratuito'
}

function formatDate(value?: string | null, withTime = false) {
  if (!value) return 'Nao informado'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Nao informado'
  return new Intl.DateTimeFormat('pt-BR', withTime
    ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}

function getPlanSubtitle(plan: PlanTier) {
  if (plan === 'premium') return 'Uso intensivo com IA, limites maximos e modelos pagos.'
  if (plan === 'basico') return 'Busca avancada com mais escala e operacao diaria ampliada.'
  return 'Camada inicial para onboarding, rotina leve e descoberta do produto.'
}

function noticeStyle(tone: 'success' | 'error' | 'neutral') {
  if (tone === 'success') return { background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.24)', color: '#34d399' }
  if (tone === 'error') return { background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.24)', color: '#f87171' }
  return { background: 'rgba(108,99,255,.08)', border: '1px solid rgba(108,99,255,.2)', color: 'var(--text)' }
}

export default function StudentAreaPanel({
  user,
  initialProfile,
  initialUsage,
  stats,
  profileCompletion,
  normalizedPlan,
}: StudentAreaPanelProps) {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(initialProfile)
  const [email, setEmail] = useState(user.email)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [profileForm, setProfileForm] = useState({
    name: initialProfile?.name ?? '',
    target_exam: initialProfile?.target_exam ?? '',
    exam_date: initialProfile?.exam_date ?? '',
    daily_goal: String(initialProfile?.daily_goal ?? 0),
  })
  const [emailNotice, setEmailNotice] = useState<Notice>(null)
  const [passwordNotice, setPasswordNotice] = useState<Notice>(null)
  const [profileNotice, setProfileNotice] = useState<Notice>(null)
  const [updatingEmail, setUpdatingEmail] = useState(false)
  const [updatingPassword, setUpdatingPassword] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)

  const effectivePlan = normalizePlanTier(profile?.plan_tier ?? normalizedPlan)
  const altoLimits = getSearchLimits(effectivePlan, 'alto')
  const advancedLimits = getSearchLimits(effectivePlan, 'advanced')

  const planCards = [
    {
      key: 'gratuito' as const,
      title: 'Gratuito',
      badge: 'Entrada',
      description: 'Ideal para validacao da experiencia.',
      features: [`${getSearchLimits('gratuito', 'alto').dailySearchLimit} buscas por dia`, 'Sem busca avancada', 'Fluxo principal liberado'],
    },
    {
      key: 'basico' as const,
      title: 'Basico',
      badge: 'Mais vendido',
      description: 'Escala equilibrada para recorrencia.',
      features: [`${getSearchLimits('basico', 'alto').dailySearchLimit} buscas por dia`, `${getSearchLimits('basico', 'advanced').dailyAdvancedLimit} avancadas`, 'Providers liberados com modelos gratuitos'],
    },
    {
      key: 'premium' as const,
      title: 'Premium',
      badge: 'Top tier',
      description: 'Capacidade completa para uso intensivo.',
      features: [`${getSearchLimits('premium', 'alto').dailySearchLimit} buscas por dia`, `${getSearchLimits('premium', 'advanced').dailyAdvancedLimit} avancadas`, 'Modelos pagos e limites maximos'],
    },
  ]

  async function handleEmailUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextEmail = email.trim().toLowerCase()
    if (!nextEmail) return setEmailNotice({ tone: 'error', text: 'Informe um email valido.' })
    if (nextEmail === user.email) return setEmailNotice({ tone: 'neutral', text: 'O email informado ja e o email atual.' })

    setUpdatingEmail(true)
    setEmailNotice(null)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ email: nextEmail })
    setUpdatingEmail(false)

    if (error) return setEmailNotice({ tone: 'error', text: error.message })

    setEmailNotice({ tone: 'success', text: 'Solicitacao enviada. Confirme o novo email para concluir a troca.' })
    router.refresh()
  }

  async function handlePasswordUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (newPassword.length < 8) return setPasswordNotice({ tone: 'error', text: 'A senha precisa ter pelo menos 8 caracteres.' })
    if (newPassword !== confirmPassword) return setPasswordNotice({ tone: 'error', text: 'A confirmacao da senha nao confere.' })

    setUpdatingPassword(true)
    setPasswordNotice(null)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setUpdatingPassword(false)

    if (error) return setPasswordNotice({ tone: 'error', text: error.message })

    setNewPassword('')
    setConfirmPassword('')
    setPasswordNotice({ tone: 'success', text: 'Senha atualizada com sucesso.' })
  }

  async function handleProfileSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSavingProfile(true)
    setProfileNotice(null)

    const supabase = createClient()
    const payload = {
      name: profileForm.name.trim() || null,
      target_exam: profileForm.target_exam.trim() || null,
      exam_date: profileForm.exam_date || null,
      daily_goal: Number(profileForm.daily_goal) > 0 ? Number(profileForm.daily_goal) : 0,
    }

    const query = profile
      ? supabase.from('profiles').update(payload).eq('id', user.id).select('*').single()
      : supabase.from('profiles').insert({ id: user.id, avatar_url: null, plan_tier: effectivePlan, ...payload }).select('*').single()

    const { data, error } = await query
    setSavingProfile(false)

    if (error) return setProfileNotice({ tone: 'error', text: error.message })

    setProfile(data)
    setProfileNotice({ tone: 'success', text: 'Perfil atualizado com sucesso.' })
    router.refresh()
  }

  return (
    <>
      <style>{`
        .student-shell { padding: 28px 32px 36px; display: flex; flex-direction: column; gap: 16px; min-height: 100%; background: radial-gradient(circle at top right, rgba(0,212,170,.08), transparent 32%), radial-gradient(circle at top left, rgba(108,99,255,.12), transparent 28%), var(--bg,#0a0c12); }
        .student-grid, .student-grid-equal, .student-plan-grid, .student-mini-grid, .student-form-grid, .student-split-grid { display: grid; gap: 16px; }
        .student-grid { grid-template-columns: minmax(0,1.45fr) minmax(320px,.85fr); }
        .student-grid-equal { grid-template-columns: repeat(2, minmax(0,1fr)); }
        .student-mini-grid { grid-template-columns: repeat(3, minmax(0,1fr)); }
        .student-plan-grid { grid-template-columns: repeat(3, minmax(0,1fr)); }
        .student-form-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
        .student-split-grid { grid-template-columns: minmax(0,1.1fr) minmax(0,.9fr); }
        .student-card { background: linear-gradient(180deg, rgba(255,255,255,.02), rgba(255,255,255,0)), var(--surface,#111420); border: 1px solid var(--border,#1f2640); border-radius: 18px; padding: 20px; box-shadow: 0 18px 40px rgba(0,0,0,.16); }
        .student-field { width: 100%; background: var(--surface2,#181d2e); border: 1px solid var(--border,#1f2640); border-radius: 10px; color: var(--text,#e8eaf6); padding: 11px 13px; outline: none; }
        .student-field:focus { border-color: var(--accent,#6c63ff); box-shadow: 0 0 0 3px rgba(108,99,255,.12); }
        .student-button { border: none; border-radius: 10px; padding: 11px 16px; cursor: pointer; font-size: 13px; font-weight: 700; }
        .student-chip { display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; padding: 6px 10px; border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.04); color: var(--text,#e8eaf6); font-size: 11px; font-weight: 600; }
        @media (max-width: 1180px) { .student-grid, .student-grid-equal, .student-plan-grid, .student-mini-grid, .student-split-grid { grid-template-columns: 1fr; } }
        @media (max-width: 780px) { .student-shell { padding: 20px 16px 24px; } .student-form-grid { grid-template-columns: 1fr; } }
      `}</style>

      <div className="student-shell">
        <div className="student-grid">
          <section className="student-card" style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(108,99,255,.22), rgba(0,212,170,.12) 58%, rgba(17,20,32,.95))' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '18px', flexWrap: 'wrap' }}>
              <div style={{ maxWidth: '640px' }}>
                <div className="student-chip" style={{ marginBottom: '14px', background: 'rgba(255,255,255,.08)' }}><ShieldCheck size={14} /> Area segura do aluno</div>
                <h1 style={{ margin: 0, fontSize: '30px', lineHeight: 1.1, letterSpacing: '-1px', color: '#fff' }}>Conta, perfil, plano e acesso rapido ao chat em um unico painel.</h1>
                <p style={{ margin: '12px 0 0', maxWidth: '620px', fontSize: '14px', lineHeight: 1.75, color: 'rgba(232,234,246,.82)' }}>
                  A proposta entrega uma Area do Aluno profissional: conta logada, edicao de email e senha, perfil do concurseiro, leitura dos beneficios do plano e CTA direto para o fluxo de IA.
                </p>
              </div>
              <div style={{ minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className="student-chip"><Mail size={14} /> {user.email}</div>
                <div className="student-chip"><Crown size={14} /> Plano {getPlanLabel(effectivePlan)}</div>
                <div className="student-chip"><Sparkles size={14} /> Perfil {profileCompletion}% completo</div>
              </div>
            </div>

            <div className="student-mini-grid" style={{ marginTop: '20px' }}>
              {[
                { label: 'Membro desde', value: formatDate(user.createdAt), sub: 'Cadastro da conta' },
                { label: 'Ultimo acesso', value: formatDate(user.lastSignInAt, true), sub: 'Atividade recente' },
                { label: 'Status', value: 'Ativa', sub: getPlanSubtitle(effectivePlan) },
              ].map(item => (
                <div key={item.label} style={{ background: 'rgba(7,10,18,.34)', border: '1px solid rgba(255,255,255,.08)', borderRadius: '14px', padding: '14px 16px' }}>
                  <div style={{ fontSize: '11px', color: 'rgba(232,234,246,.65)', textTransform: 'uppercase', letterSpacing: '1px' }}>{item.label}</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginTop: '8px' }}>{item.value}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(232,234,246,.72)', marginTop: '4px', lineHeight: 1.5 }}>{item.sub}</div>
                </div>
              ))}
            </div>
          </section>

          <aside className="student-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(108,99,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}><UserRound size={20} /></div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Resumo da conta</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>Visao consolidada do aluno</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: 'Sessoes salvas', value: String(stats.sessionsCount), color: 'var(--accent)' },
                { label: 'Flashcards', value: String(stats.flashcardsCount), color: 'var(--accent2)' },
                { label: 'Questoes respondidas', value: String(stats.answersCount), color: 'var(--amber)' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '12px 14px', borderRadius: '12px', background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{item.label}</span>
                  <strong style={{ fontSize: '20px', color: item.color }}>{item.value}</strong>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Preenchimento do perfil</span>
                <span style={{ fontSize: '12px', color: 'var(--text)', fontWeight: 700 }}>{profileCompletion}%</span>
              </div>
              <div style={{ width: '100%', height: '10px', borderRadius: '999px', background: 'var(--surface2)', overflow: 'hidden' }}>
                <div style={{ width: `${profileCompletion}%`, height: '100%', borderRadius: '999px', background: 'linear-gradient(90deg, var(--accent), var(--accent2))' }} />
              </div>
            </div>
          </aside>
        </div>

        <div className="student-grid-equal">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <section className="student-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}><Mail size={18} color="var(--accent)" /><div><div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Conta e seguranca</div><div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>Atualizacao real de credenciais via autenticacao.</div></div></div>
              <div style={{ marginBottom: '16px', padding: '14px 16px', borderRadius: '12px', background: 'rgba(108,99,255,.08)', border: '1px solid rgba(108,99,255,.18)' }}>
                <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Email atual</div>
                <div style={{ fontSize: '16px', color: 'var(--text)', fontWeight: 700, marginTop: '6px' }}>{user.email}</div>
              </div>

              <form onSubmit={handleEmailUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '22px' }}>
                <input className="student-field" type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="novo@email.com" />
                <button className="student-button" type="submit" disabled={updatingEmail} style={{ background: 'var(--accent)', color: '#fff', alignSelf: 'flex-start' }}>{updatingEmail ? 'Atualizando...' : 'Atualizar email'}</button>
                {emailNotice && <div style={{ ...noticeStyle(emailNotice.tone), borderRadius: '10px', padding: '11px 13px', fontSize: '13px', lineHeight: 1.6 }}>{emailNotice.text}</div>}
              </form>

              <form onSubmit={handlePasswordUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><LockKeyhole size={16} color="var(--accent2)" /><span style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Alterar senha</span></div>
                <div className="student-form-grid">
                  <input className="student-field" type="password" value={newPassword} onChange={event => setNewPassword(event.target.value)} placeholder="Nova senha" />
                  <input className="student-field" type="password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} placeholder="Confirmar nova senha" />
                </div>
                <button className="student-button" type="submit" disabled={updatingPassword} style={{ background: 'var(--accent2)', color: '#03231b', alignSelf: 'flex-start' }}>{updatingPassword ? 'Salvando...' : 'Trocar senha'}</button>
                {passwordNotice && <div style={{ ...noticeStyle(passwordNotice.tone), borderRadius: '10px', padding: '11px 13px', fontSize: '13px', lineHeight: 1.6 }}>{passwordNotice.text}</div>}
              </form>
            </section>

            <section className="student-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}><UserRound size={18} color="var(--accent)" /><div><div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Editar perfil</div><div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>Dados que personalizam a jornada do aluno.</div></div></div>
              <form onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="student-form-grid">
                  <input className="student-field" value={profileForm.name} onChange={event => setProfileForm(current => ({ ...current, name: event.target.value }))} placeholder="Nome do aluno" />
                  <input className="student-field" type="number" min={0} value={profileForm.daily_goal} onChange={event => setProfileForm(current => ({ ...current, daily_goal: event.target.value }))} placeholder="Meta diaria em minutos" />
                </div>
                <div className="student-form-grid">
                  <input className="student-field" value={profileForm.target_exam} onChange={event => setProfileForm(current => ({ ...current, target_exam: event.target.value }))} placeholder="Concurso alvo" />
                  <input className="student-field" type="date" value={profileForm.exam_date} onChange={event => setProfileForm(current => ({ ...current, exam_date: event.target.value }))} />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Plano vinculado: <strong style={{ color: 'var(--text)' }}>{getPlanLabel(effectivePlan)}</strong></div>
                  <button className="student-button" type="submit" disabled={savingProfile} style={{ background: 'var(--accent)', color: '#fff' }}>{savingProfile ? 'Salvando...' : 'Salvar perfil'}</button>
                </div>
                {profileNotice && <div style={{ ...noticeStyle(profileNotice.tone), borderRadius: '10px', padding: '11px 13px', fontSize: '13px', lineHeight: 1.6 }}>{profileNotice.text}</div>}
              </form>
            </section>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <section className="student-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Crown size={18} color="var(--amber)" /><div><div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Plano e beneficios</div><div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>Status comercial e operacional do aluno.</div></div></div>
                <div className="student-chip" style={{ color: 'var(--amber)' }}><Crown size={14} /> Plano atual: {getPlanLabel(effectivePlan)}</div>
              </div>

              <div className="student-split-grid" style={{ marginBottom: '16px' }}>
                <div style={{ padding: '16px', borderRadius: '14px', background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Consumo do dia</div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
                    <div><div style={{ fontSize: '26px', color: 'var(--accent)', fontWeight: 700 }}>{initialUsage.alto_busca_count}</div><div style={{ fontSize: '12px', color: 'var(--muted)' }}>de {altoLimits.dailySearchLimit} buscas</div></div>
                    <div><div style={{ fontSize: '26px', color: 'var(--accent2)', fontWeight: 700 }}>{initialUsage.advanced_busca_count}</div><div style={{ fontSize: '12px', color: 'var(--muted)' }}>de {advancedLimits.dailyAdvancedLimit} avancadas</div></div>
                  </div>
                </div>
                <div style={{ padding: '16px', borderRadius: '14px', background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Leitura do plano</div>
                  <div style={{ fontSize: '15px', color: 'var(--text)', fontWeight: 700, marginTop: '8px', lineHeight: 1.5 }}>{getPlanSubtitle(effectivePlan)}</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '8px', lineHeight: 1.6 }}>A troca automatica do plano pode ser ligada depois ao checkout sem refazer esta interface.</div>
                </div>
              </div>

              <div className="student-plan-grid">
                {planCards.map(plan => {
                  const active = plan.key === effectivePlan
                  return (
                    <div key={plan.key} style={{ padding: '16px', borderRadius: '14px', background: active ? 'rgba(108,99,255,.12)' : 'var(--surface2)', border: active ? '1px solid rgba(108,99,255,.34)' : '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                        <div style={{ fontSize: '16px', color: 'var(--text)', fontWeight: 700 }}>{plan.title}</div>
                        <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', padding: '5px 8px', borderRadius: '999px', background: active ? 'rgba(108,99,255,.16)' : 'rgba(255,255,255,.06)', color: active ? 'var(--accent)' : 'var(--muted)' }}>{active ? 'Plano atual' : plan.badge}</div>
                      </div>
                      <p style={{ margin: '10px 0 0', fontSize: '12px', lineHeight: 1.65, color: 'var(--muted)' }}>{plan.description}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                        {plan.features.map(feature => (
                          <div key={feature} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '12px', color: 'var(--text)', lineHeight: 1.55 }}>
                            <CheckCircle2 size={14} color={active ? 'var(--accent)' : 'var(--accent2)'} style={{ flexShrink: 0, marginTop: '2px' }} />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="student-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}><MessageSquare size={18} color="var(--accent2)" /><div><div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Chat e acompanhamento</div><div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>Entrada clara para a conversa com IA.</div></div></div>
              <div style={{ padding: '18px', borderRadius: '16px', background: 'linear-gradient(135deg, rgba(0,212,170,.12), rgba(108,99,255,.1))', border: '1px solid rgba(0,212,170,.16)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ maxWidth: '520px' }}>
                    <div className="student-chip" style={{ marginBottom: '12px', color: 'var(--accent2)' }}><Bot size={14} /> Chat StudyAI</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>Converse com a IA para estudar, revisar e aprofundar duvidas em tempo real.</div>
                    <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.7, marginTop: '10px' }}>A Area do Aluno fecha o ciclo: identidade da conta, plano, seguranca e CTA direto para o fluxo academico principal.</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '220px' }}>
                    <Link href="/dashboard/busca" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '12px 16px', borderRadius: '10px', background: 'var(--accent)', color: '#fff', textDecoration: 'none', fontSize: '13px', fontWeight: 700 }}>Abrir chat de estudos</Link>
                    <Link href="/dashboard/resumos" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '12px 16px', borderRadius: '10px', background: 'transparent', color: 'var(--text)', textDecoration: 'none', border: '1px solid var(--border)', fontSize: '13px', fontWeight: 700 }}>Ir para biblioteca</Link>
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '18px' }}>
                  {[
                    'Perguntas em tempo real com IA',
                    'Resumos e flashcards como continuidade',
                    'Ponto unico de relacionamento do aluno',
                  ].map(item => (
                    <div key={item} className="student-chip" style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.08)', color: 'var(--text)' }}>
                      <Sparkles size={13} />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  )
}
