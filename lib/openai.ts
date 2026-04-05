import OpenAI from 'openai'

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export type GenerateType = 'summary' | 'flashcards' | 'questions'

export function buildPrompt(content: string, type: GenerateType): string {
  const prompts: Record<GenerateType, string> = {
    summary: `Você é um professor especialista em concursos públicos brasileiros.
Crie um resumo didático, completo e estruturado sobre o tema abaixo.
Use markdown com: títulos (##), subtítulos (###), listas, negrito para termos-chave e blocos de dica para pontos de prova.
Inclua: conceito, fundamento legal, doutrina relevante, jurisprudência recente e dicas das principais bancas (CESPE, FGV, FCC, VUNESP).
Tema: ${content}`,

    flashcards: `Você é um professor especialista em concursos públicos brasileiros.
Crie exatamente 10 flashcards sobre o tema abaixo, no formato JSON.
Retorne APENAS o array JSON, sem texto adicional, sem markdown, sem explicações.
Formato: [{"front":"pergunta objetiva","back":"resposta direta e completa"}]
Os flashcards devem cobrir os pontos mais cobrados em provas.
Tema: ${content}`,

    questions: `Você é um professor especialista em concursos públicos brasileiros.
Crie 5 questões de múltipla escolha sobre o tema abaixo, no formato JSON.
Inclua questões estilo CESPE (certo/errado) e FGV (múltipla escolha com 5 alternativas).
Retorne APENAS o array JSON, sem texto adicional, sem markdown.
Formato: [{"question":"texto da questão","tipo":"cv|mc","options":["A","B","C","D","E"],"correct":0,"gabarito":"C|E","explanation":"explicação detalhada","banca":"CESPE 2023"}]
Para tipo "cv" (certo/errado), omita options e use gabarito "C" ou "E".
Para tipo "mc", use options com 5 alternativas e correct com índice 0-4.
Tema: ${content}`,
  }

  return prompts[type]
}
