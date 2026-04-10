import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'

export const metadata: Metadata = {
  title: 'StudyAI — Estudo inteligente para concursos',
  description: 'Plataforma de estudos com IA para concurseiros. Resumos, flashcards, questões e cronograma em um só lugar.',
  keywords: ['concursos', 'estudo', 'IA', 'flashcards', 'resumos', 'questões'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
