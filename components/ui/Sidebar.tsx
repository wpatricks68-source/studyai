'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/types/database'
import { ThemeToggle } from '@/components/ThemeToggle'

const navItems = [
  {
    section: 'Principal',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: IconGrid },
      { href: '/dashboard/busca', label: 'Busca + IA', icon: IconSearch },
      { href: '/dashboard/resumos', label: 'Resumos', icon: IconBook },
      { href: '/dashboard/flashcards', label: 'Estudo Ativo', icon: IconCards },
    ],
  },
  {
    section: 'Organizacao',
    items: [
      { href: '/dashboard/cronograma', label: 'Cronograma', icon: IconCalendar },
      { href: '/dashboard/controle-diario', label: 'Controle Diario', icon: IconChecklist },
      { href: '/dashboard/edital-verticalizado', label: 'Edital Verticalizado', icon: IconLayers },
      { href: '/dashboard/estatisticas', label: 'Estatisticas', icon: IconChart },
    ],
  },
  {
    section: 'Ferramentas',
    items: [{ href: '/dashboard/ferramentas', label: 'Pomodoro', icon: IconClock }],
  },
]

export default function Sidebar({ user, profile }: { user: User; profile: Profile | null }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = (profile?.name ?? user.email ?? 'U')
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <aside
      style={{
        width: '200px',
        flexShrink: 0,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '18px 16px 14px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent)', letterSpacing: '-0.5px' }}>
            StudyAI
          </div>
          <div style={{ fontSize: '10px', color: 'var(--muted)', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '2px' }}>
            Concursos
          </div>
        </div>
        <ThemeToggle />
      </div>

      <nav style={{ padding: '10px 8px', flex: 1, overflowY: 'auto' }}>
        {navItems.map(group => (
          <div key={group.section}>
            <div style={{ fontSize: '10px', color: 'var(--muted)', letterSpacing: '1.5px', textTransform: 'uppercase', padding: '10px 10px 5px' }}>
              {group.section}
            </div>
            {group.items.map(item => {
              const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '9px',
                    padding: active ? '8px 8px 8px 8px' : '8px 10px',
                    borderRadius: '8px',
                    marginBottom: '2px',
                    fontSize: '13px',
                    textDecoration: 'none',
                    color: active ? 'var(--accent)' : 'var(--muted)',
                    background: active ? 'rgba(108,99,255,.15)' : 'transparent',
                    borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                    transition: 'all .12s',
                  }}
                >
                  <item.icon active={active} />
                  {item.label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div style={{ padding: '12px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg,#6c63ff,#00d4aa)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 600,
              color: '#fff',
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text)', fontWeight: 500 }}>{profile?.name?.split(' ')[0] ?? 'Usuario'}</div>
            <div style={{ fontSize: '10px', color: 'var(--muted)' }}>{profile?.target_exam ?? 'Concurso'}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            padding: '7px',
            borderRadius: '7px',
            background: 'transparent',
            border: '1px solid var(--border)',
            color: 'var(--muted)',
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'all .12s',
          }}
        >
          Sair
        </button>
      </div>
    </aside>
  )
}

function IconGrid({ active }: { active: boolean }) {
  return <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" style={{ opacity: active ? 1 : 0.7, flexShrink: 0 }}><rect x="1" y="1" width="6" height="6" rx="1.5" /><rect x="9" y="1" width="6" height="6" rx="1.5" /><rect x="1" y="9" width="6" height="6" rx="1.5" /><rect x="9" y="9" width="6" height="6" rx="1.5" /></svg>
}
function IconSearch({ active }: { active: boolean }) {
  return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: active ? 1 : 0.7, flexShrink: 0 }}><circle cx="7" cy="7" r="5" /><path d="M11 11l3 3" /></svg>
}
function IconBook({ active }: { active: boolean }) {
  return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: active ? 1 : 0.7, flexShrink: 0 }}><path d="M4 4h8M4 8h8M4 12h5" /><rect x="1" y="1" width="14" height="14" rx="2" /></svg>
}
function IconCards({ active }: { active: boolean }) {
  return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: active ? 1 : 0.7, flexShrink: 0 }}><rect x="2" y="3" width="12" height="9" rx="2" /><path d="M5 7h6M5 10h4" /></svg>
}
function IconCalendar({ active }: { active: boolean }) {
  return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: active ? 1 : 0.7, flexShrink: 0 }}><rect x="2" y="3" width="12" height="12" rx="1.5" /><path d="M5 1v4M11 1v4M2 7h12" /></svg>
}
function IconChecklist({ active }: { active: boolean }) {
  return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: active ? 1 : 0.7, flexShrink: 0 }}><rect x="2" y="2" width="12" height="12" rx="2" /><path d="M6.2 5.2l.8.8 1.5-1.8" /><path d="M5 8h6M5 10.8h4" /></svg>
}
function IconChart({ active }: { active: boolean }) {
  return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: active ? 1 : 0.7, flexShrink: 0 }}><path d="M2 12l3-4 3 2 3-5 3 3" /></svg>
}
function IconClock({ active }: { active: boolean }) {
  return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: active ? 1 : 0.7, flexShrink: 0 }}><circle cx="8" cy="8" r="6" /><path d="M8 4v4l3 2" /></svg>
}
function IconLayers({ active }: { active: boolean }) {
  return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: active ? 1 : 0.7, flexShrink: 0 }}><path d="M8 2l6 3-6 3-6-3 6-3z" /><path d="M2 8l6 3 6-3" /><path d="M2 11l6 3 6-3" /></svg>
}
