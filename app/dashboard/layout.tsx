import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/ui/Sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle() // 🔥 CORREÇÃO AQUI

  return (
    <>
      <style>{`
        @media (max-width: 960px) {
          .dashboard-main {
            padding-top: 58px;
          }
        }
      `}</style>
      <div
        style={{
          display: 'flex',
          height: '100vh',
          overflow: 'hidden',
          background: 'var(--bg)',
        }}
      >
        <Sidebar user={user} profile={profile} />
        <main
          className="dashboard-main"
          style={{
            flex: 1,
            minWidth: 0,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {children}
        </main>
      </div>
    </>
  )
}
