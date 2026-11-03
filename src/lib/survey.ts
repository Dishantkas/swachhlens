// System Usability Scale (Brooke, 1996), worded for a website.
export const SUS_ITEMS = [
  'I think that I would like to use this website frequently.',
  'I found the website unnecessarily complex.',
  'I thought the website was easy to use.',
  'I think that I would need the support of a technical person to be able to use this website.',
  'I found the various functions in this website were well integrated.',
  'I thought there was too much inconsistency in this website.',
  'I would imagine that most people would learn to use this website very quickly.',
  'I found the website very cumbersome to use.',
  'I felt very confident using the website.',
  'I needed to learn a lot of things before I could get going with this website.',
]

export const EXTRA_ITEMS = [
  {
    key: 'ease',
    text: 'Reporting waste with a photo on SwachhLens is easier than traditional ways (calling or visiting the municipal office).',
    short: 'Easier than traditional reporting',
  },
  {
    key: 'aiTrust',
    text: "The AI's waste type and weight estimates looked accurate to me.",
    short: 'Trust in AI results',
  },
  {
    key: 'motivation',
    text: 'Earning points and seeing the leaderboard motivates me to report or clean up waste.',
    short: 'Motivation from points',
  },
  {
    key: 'recommend',
    text: 'I would recommend SwachhLens to others in my area.',
    short: 'Would recommend',
  },
] as const

export type ExtraKey = (typeof EXTRA_ITEMS)[number]['key']

export const AGE_GROUPS = ['Under 18', '18–24', '25–34', '35–44', '45 and above']
export const OCCUPATIONS = ['Student', 'Working professional', 'Self-employed', 'Homemaker', 'Other']
export const PRIOR_METHODS = [
  'Never reported waste before',
  'Phone call to the municipality',
  'Municipal app or website',
  'Social media',
  'Told a sweeper or staff member in person',
  'Other',
]

export const LIKERT = ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree']

export type SurveyAnswers = {
  ageGroup: string
  occupation: string
  priorMethod: string
  sus: number[]
  ease: number
  aiTrust: number
  motivation: number
  recommend: number
  comments: string
}
