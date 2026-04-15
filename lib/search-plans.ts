export type PlanTier = 'gratuito' | 'basico' | 'premium'
export type SearchMode = 'alto' | 'advanced'
export type SearchProvider = 'auto' | 'gpt' | 'gemini' | 'claude'

type SearchLimits = {
  canUseAdvanced: boolean
  maxSources: number
  maxCharsPerSource: number
  maxPromptChars: number
  maxResponseChars: number
  dailySearchLimit: number
  dailyAdvancedLimit: number
  allowedProviders: Exclude<SearchProvider, 'auto'>[]
  allowPaidModels: boolean
}

const PLAN_RULES: Record<PlanTier, Record<SearchMode, SearchLimits>> = {
  gratuito: {
    alto: {
      canUseAdvanced: false,
      maxSources: 3,
      maxCharsPerSource: 900,
      maxPromptChars: 3200,
      maxResponseChars: 3500,
      dailySearchLimit: 10,
      dailyAdvancedLimit: 0,
      allowedProviders: [],
      allowPaidModels: false,
    },
    advanced: {
      canUseAdvanced: false,
      maxSources: 0,
      maxCharsPerSource: 0,
      maxPromptChars: 0,
      maxResponseChars: 0,
      dailySearchLimit: 10,
      dailyAdvancedLimit: 0,
      allowedProviders: [],
      allowPaidModels: false,
    },
  },
  basico: {
    alto: {
      canUseAdvanced: true,
      maxSources: 4,
      maxCharsPerSource: 1100,
      maxPromptChars: 4800,
      maxResponseChars: 6000,
      dailySearchLimit: 40,
      dailyAdvancedLimit: 15,
      allowedProviders: ['gpt', 'gemini', 'claude'],
      allowPaidModels: false,
    },
    advanced: {
      canUseAdvanced: true,
      maxSources: 5,
      maxCharsPerSource: 1200,
      maxPromptChars: 6500,
      maxResponseChars: 8000,
      dailySearchLimit: 40,
      dailyAdvancedLimit: 15,
      allowedProviders: ['gpt', 'gemini', 'claude'],
      allowPaidModels: false,
    },
  },
  premium: {
    alto: {
      canUseAdvanced: true,
      maxSources: 5,
      maxCharsPerSource: 1300,
      maxPromptChars: 7000,
      maxResponseChars: 8000,
      dailySearchLimit: 100,
      dailyAdvancedLimit: 50,
      allowedProviders: ['gpt', 'gemini', 'claude'],
      allowPaidModels: true,
    },
    advanced: {
      canUseAdvanced: true,
      maxSources: 7,
      maxCharsPerSource: 1500,
      maxPromptChars: 10000,
      maxResponseChars: 15000,
      dailySearchLimit: 100,
      dailyAdvancedLimit: 50,
      allowedProviders: ['gpt', 'gemini', 'claude'],
      allowPaidModels: true,
    },
  },
}

export function normalizePlanTier(value: unknown): PlanTier {
  if (value === 'basico' || value === 'premium') return value
  return 'gratuito'
}

export function getSearchLimits(plan: PlanTier, mode: SearchMode): SearchLimits {
  return PLAN_RULES[plan][mode]
}

export function isProviderAllowed(
  plan: PlanTier,
  mode: SearchMode,
  provider: SearchProvider,
) {
  if (mode === 'alto') return provider === 'auto'
  return provider !== 'auto' && getSearchLimits(plan, mode).allowedProviders.includes(provider)
}
