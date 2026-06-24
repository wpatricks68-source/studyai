'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/types/database'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Menu, X } from 'lucide-react'
import { GlobalTimer } from './GlobalTimer'
import { isAdminRole } from '@/lib/auth/permissions'

const baseNavItems = [
  {
    section: 'Principal',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: IconGrid },
      { href: '/dashboard/busca', label: 'Edição + IA', icon: IconSearch },
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
    items: [
      { href: '/dashboard/ferramentas', label: 'Pomodoro', icon: IconClock },
      { href: '/dashboard/lembretes', label: 'Lembretes', icon: IconNote },
    ],
  },
]

export default function Sidebar({ user, profile }: { user: User; profile: Profile | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const isAdmin = isAdminRole(profile?.role)
  const navItems = [
    ...baseNavItems,
    ...(isAdmin
      ? [
          {
            section: 'Administracao',
            items: [{ href: '/dashboard/admin', label: 'Painel Admin', icon: IconShield }],
          },
        ]
      : []),
  ]

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

        .sb-nav-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 11px;
          border-radius: 10px;
          margin-bottom: 2px;
          font-size: 13px;
          font-weight: 500;
          text-decoration: none;
          color: var(--muted);
          transition: all .18s cubic-bezier(.4,0,.2,1);
          position: relative;
          letter-spacing: -0.1px;
        }
        .sb-nav-link:hover {
          color: var(--text);
          background: var(--sidebar-hover);
        }
        .sb-nav-link.active {
          color: #fff;
          background: linear-gradient(135deg, rgba(116,97,255,0.85) 0%, rgba(91,200,255,0.7) 100%);
          box-shadow: 0 4px 20px rgba(116,97,255,0.3);
          font-weight: 600;
        }
        .light .sb-nav-link.active {
          background: linear-gradient(135deg, rgba(91,79,255,0.9) 0%, rgba(0,140,255,0.7) 100%);
          box-shadow: 0 4px 20px rgba(91,79,255,0.25);
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
            border: 1px solid var(--sidebar-mobile-border);
            background: var(--sidebar-mobile-bg);
            color: var(--text);
            align-items: center;
            justify-content: center;
            box-shadow: 0 10px 30px rgba(0,0,0,.38);
            backdrop-filter: blur(16px);
          }

          .sidebar-backdrop {
            display: block;
            position: fixed;
            inset: 0;
            z-index: 70;
            background: var(--sidebar-backdrop);
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
            width: min(82vw, 300px) !important;
            z-index: 80;
            transform: translateX(-100%);
            transition: transform .24s cubic-bezier(.4,0,.2,1), box-shadow .24s ease;
            box-shadow: none;
          }

          .sidebar-shell[data-open="true"] {
            transform: translateX(0);
            box-shadow: 0 0 80px rgba(0,0,0,.6);
          }

          .sidebar-close-btn {
            display: inline-flex;
            width: 34px;
            height: 34px;
            border-radius: 10px;
            border: 1px solid var(--sidebar-mobile-border);
            background: var(--sidebar-panel);
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
          width: '215px',
          flexShrink: 0,
          background: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--sidebar-border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Glowing orb background decoration */}
        <div style={{
          position: 'absolute',
          top: '-40px',
          left: '-40px',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'var(--sidebar-orb)',
          pointerEvents: 'none',
        }} />

        {/* Logo header */}
        <div style={{
          padding: '20px 16px 16px',
          borderBottom: '1px solid var(--sidebar-divider)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '10px',
        }}>
          <div>
            <div style={{
              fontSize: '19px',
              fontWeight: 800,
              letterSpacing: '-0.7px',
              background: 'linear-gradient(135deg, #7461ff, #00e5b0)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              StudyAI
            </div>
            <div style={{ fontSize: '9px', color: 'var(--muted)', letterSpacing: '2.5px', textTransform: 'uppercase', marginTop: '3px' }}>
              Concursos
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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

        {/* Account Section */}
        <div style={{ padding: '4px 12px 0' }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            padding: '10px',
            borderRadius: '16px',
            background: 'var(--sidebar-panel)',
            border: '1px solid var(--sidebar-panel-border)',
            marginBottom: '4px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '2px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: profile?.avatar_url ? 'transparent' : 'linear-gradient(135deg, #7461ff, #00e5b0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 700,
                color: '#fff',
                flexShrink: 0,
                boxShadow: profile?.avatar_url ? '0 4px 10px rgba(0,0,0,0.12)' : '0 4px 12px rgba(116,97,255,0.35)',
                overflow: 'hidden',
              }}>
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  initials
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '12px', color: 'var(--text)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {profile?.name?.split(' ')[0] ?? 'Usuário'}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {profile?.target_exam ?? 'Concurso'}
                </div>
              </div>
            </div>
            
            <div style={{ height: '1px', background: 'var(--sidebar-divider)', margin: '2px 0' }} />
            
            <Link
              href="/dashboard/aluno"
              onClick={() => setMobileOpen(false)}
              className={`sb-nav-link${pathname === '/dashboard/aluno' ? ' active' : ''}`}
              style={{ margin: 0, padding: '7px 9px' }}
            >
              <IconUser active={pathname === '/dashboard/aluno'} />
              Area do Aluno
            </Link>
          </div>
        </div>

        {/* Timer */}
        <div style={{ padding: '4px 12px 0' }}>
          <GlobalTimer />
        </div>

        {/* Navigation */}
        <nav style={{ padding: '8px 10px 10px', flex: 1, overflowY: 'auto' }}>
          {navItems.map(group => (
            <div key={group.section} style={{ marginBottom: '10px' }}>
              <div style={{
                fontSize: '9px',
                color: 'var(--muted)',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                padding: '8px 11px 5px',
                opacity: 0.85,
                fontWeight: 600,
              }}>
                {group.section}
              </div>
              {group.items.map(item => {
                const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`sb-nav-link${active ? ' active' : ''}`}
                  >
                    <item.icon active={active} />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div style={{
          padding: '8px 12px 12px',
          borderTop: '1px solid var(--sidebar-divider)',
        }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '9px',
              background: 'rgba(239,68,68,0.07)',
              border: '1px solid rgba(239,68,68,0.15)',
              color: 'rgba(255,130,130,0.8)',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all .16s ease',
              letterSpacing: '0.1px',
            }}
            onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(239,68,68,0.14)' }}
            onMouseLeave={e => { (e.target as HTMLElement).style.background = 'rgba(239,68,68,0.07)' }}
          >
            Sair da conta
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
function IconUser({ active }: { active: boolean }) {
  return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: active ? 1 : 0.7, flexShrink: 0 }}><circle cx="8" cy="5" r="2.5" /><path d="M3 13c.8-2 2.6-3 5-3s4.2 1 5 3" /></svg>
}
function IconShield({ active }: { active: boolean }) {
  return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: active ? 1 : 0.7, flexShrink: 0 }}><path d="M8 1.5l5 2v3.9c0 3.1-1.9 5.9-5 7.1-3.1-1.2-5-4-5-7.1V3.5l5-2z" /><path d="M6.2 8.1l1.2 1.2 2.5-2.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
function IconNote({ active }: { active: boolean }) {
  return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: active ? 1 : 0.7, flexShrink: 0 }}><rect x="2" y="1" width="12" height="14" rx="2" /><path d="M5 5h6M5 8h6M5 11h3" strokeLinecap="round" /></svg>
}
