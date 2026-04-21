export interface Profile {
  id: string
  name: string | null
  avatar_url: string | null
  daily_goal: number
  plan_tier: 'gratuito' | 'basico' | 'premium' | string | null
  role: 'user' | 'admin' | string | null
  target_exam: string | null
  exam_date: string | null
  created_at: string
}

export interface StudySession {
  id: string
  user_id: string
  title: string
  topic: string
  content: string | null
  materia: string | null
  source_type: 'web' | 'upload'
  duration_min: number
  revisoes: number
  revisao_dates: string[] | null   // ISO dates of each revision
  tags: string[]
  notas: string | null
  created_at: string
  updated_at: string
}

export interface Flashcard {
  id: string
  user_id: string
  session_id: string | null
  front: string
  back: string
  topic: string | null
  materia: string | null
  difficulty: number
  next_review: string
  created_at: string
}

export interface Question {
  id: string
  user_id: string
  session_id: string | null
  question: string
  tipo: 'cv' | 'mc'
  options: string[] | null
  correct: number | null
  gabarito: string | null
  explanation: string | null
  banca: string | null
  topic: string | null
  materia: string | null
  created_at: string
}

export interface QuestionAnswer {
  id: string
  user_id: string
  question_id: string
  session_id: string | null
  selected: string | null
  is_correct: boolean
  answered_at: string
}

export interface Schedule {
  id: string
  user_id: string
  subject: string
  materia: string | null
  day_of_week: number
  start_time: string
  end_time: string
  color: string
  is_active: boolean
}

export interface TimerSession {
  id: string
  user_id: string
  study_id: string | null
  tipo: 'pomodoro' | 'stopwatch' | 'timer'
  duration_min: number
  started_at: string
}

export interface PlannerSubject {
  id: string
  user_id: string
  name: string
  code: string | null
  description: string | null
  status: 'Ativo' | 'Em Breve' | 'Pausado' | string
  target_sessions: number | null
  completed_sessions: number | null
  color: string
  created_at: string
}

export interface StudyCycle {
  id: string
  user_id: string
  subject_id: string
  duration_minutes: number
  order_index: number
  created_at: string
}

export interface DailyStudyLog {
  id: string
  user_id: string
  study_date: string
  subject: string
  target_status: 'nao_concluido' | 'parcial' | 'concluido' | string
  planned_minutes: number
  effective_minutes: number
  description: string | null
  material: string | null
  start_page: number | null
  end_page: number | null
  questions_resolved: number
  correct_answers: number
  created_at: string
  updated_at: string
}

export interface UsageDaily {
  id: string
  user_id: string
  usage_date: string
  alto_busca_count: number
  advanced_busca_count: number
  created_at: string
  updated_at: string
}

export interface AdminAuditLog {
  id: string
  admin_user_id: string
  action: string
  target_type: string
  target_id: string | null
  payload: Record<string, unknown> | null
  created_at: string
}

export interface EditalBoard {
  id: string
  user_id: string
  title: string
  source_file_name: string | null
  source_file_type: string | null
  source_excerpt: string | null
  ai_provider: string | null
  ai_model: string | null
  last_processed_at: string | null
  created_at: string
  updated_at: string
}

export interface EditalTopic {
  id: string
  board_id: string
  user_id: string
  disciplina: string
  tema: string
  subtema: string
  estudo: boolean
  resumo: boolean
  revisao_1: boolean
  revisao_2: boolean
  revisao_3: boolean
  concluido: boolean
  status: 'pending' | 'in-progress' | 'done'
  order_index: number
  created_at: string
  updated_at: string
}
