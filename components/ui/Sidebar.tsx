'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/types/database'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Menu, X } from 'lucide-react'

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
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

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
    <>
      <style>{`
        .sidebar-backdrop,
        .sidebar-mobile-toggle,
        .sidebar-close-btn {
          display: none;
        }

        @media (max-width: 960px) {
          .sidebar-mobile-toggle {
            display: inline-flex;
            position: fixed;
            top: 14px;
            left: 14px;
            z-index: 90;
            width: 42px;
            height: 42px;
            border-radius: 12px;
            border: 1px solid rgba(255,255,255,.08);
            background: rgba(17,20,32,.9);
            color: var(--text);
            align-items: center;
            justify-content: center;
            box-shadow: 0 10px 30px rgba(0,0,0,.28);
            backdrop-filter: blur(12px);
          }

          .sidebar-backdrop {
            display: block;
            position: fixed;
            inset: 0;
            z-index: 70;
            background: rgba(5,7,12,.58);
            opacity: 0;
            pointer-events: none;
            transition: opacity .2s ease;
          }

          .sidebar-backdrop[data-open="true"] {
            opacity: 1;
            pointer-events: auto;
          }

          .sidebar-shell {
            position: fixed !important;
            top: 0;
            left: 0;
            bottom: 0;
            width: min(82vw, 320px) !important;
            z-index: 80;
            transform: translateX(-100%);
            transition: transform .24s ease, box-shadow .24s ease;
            box-shadow: none;
          }

          .sidebar-shell[data-open="true"] {
            transform: translateX(0);
            box-shadow: 0 22px 60px rgba(0,0,0,.42);
          }

          .sidebar-close-btn {
            display: inline-flex;
            width: 34px;
            height: 34px;
            border-radius: 10px;
            border: 1px solid rgba(255,255,255,.08);
            background: rgba(255,255,255,.04);
            color: var(--text);
            align-items: center;
            justify-content: center;
          }
        }
      `}</style>

      <button
        type="button"
        className="sidebar-mobile-toggle"
        aria-label="Abrir menu"
        onClick={() => setMobileOpen(true)}
      >
        <Menu size={18} />
      </button>

      <div
        className="sidebar-backdrop"
        data-open={mobileOpen}
        onClick={() => setMobileOpen(false)}
      />

      <aside
        className="sidebar-shell"
        data-open={mobileOpen}
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
            gap: '10px',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ThemeToggle />
            <button
              type="button"
              className="sidebar-close-btn"
              aria-label="Fechar menu"
              onClick={() => setMobileOpen(false)}
            >
              <X size={16} />
            </button>
          </div>
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
                    onClick={() => setMobileOpen(false)}
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
    </>
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
