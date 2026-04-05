import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    return <pre>Erro auth: {JSON.stringify(error, null, 2)}</pre>
  }

  if (!user) {
    redirect('/auth/login')
  }

  return (
    <div style={{ padding: 40, color: 'white', background: '#020617', minHeight: '100vh' }}>
      <h1>Login funcionando</h1>
      <p>Usuário autenticado:</p>
      <pre>{JSON.stringify(user, null, 2)}</pre>
    </div>
  )
}