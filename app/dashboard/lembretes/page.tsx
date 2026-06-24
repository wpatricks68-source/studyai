import NotesBoard from '@/components/tools/NotesBoard'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Lembretes | StudyAI',
  description: 'Gerencie seus lembretes, tarefas e ideias de estudo em um só lugar.',
}

export default function LembretesPage() {
  return <NotesBoard />
}
