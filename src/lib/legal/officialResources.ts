/**
 * Central registry of official sources and the legal-information rules Level
 * relies on. Components must link through this file rather than hard-coding
 * URLs. Update `LAST_REVIEWED` whenever any entry is re-verified.
 */

export const LAST_REVIEWED = '2026-09-27'

export interface OfficialLink {
  id: string
  label: string
  url: string
  publisher: string
  note?: string
}

export const OFFICIAL_LINKS = {
  form128: {
    id: 'form128',
    label: 'State Tax Form 128 — Application for Abatement of Real Property Tax (PDF)',
    url: 'https://www.mass.gov/files/documents/2018/01/09/form128_0.pdf',
    publisher: 'Massachusetts Department of Revenue',
  },
  bostonHowToFile: {
    id: 'bostonHowToFile',
    label: 'How to file for a real estate tax abatement',
    url: 'https://www.boston.gov/departments/assessing/how-file-real-estate-tax-abatement',
    publisher: 'City of Boston Assessing Department',
    note: 'Boston posts the current fiscal-year filing deadline and filing methods here.',
  },
  bostonPropertyLookup: {
    id: 'bostonPropertyLookup',
    label: 'Boston Property Lookup (online abatement application)',
    url: 'https://properties.boston.gov/',
    publisher: 'City of Boston Assessing Department',
    note: 'Boston states that online applications become available through the "Taxes and Exemptions" tab after third-quarter bills are issued.',
  },
  bostonExemptionsAbatements: {
    id: 'bostonExemptionsAbatements',
    label: 'Tax exemptions and abatements',
    url: 'https://www.boston.gov/departments/assessing/tax-exemptions-and-abatements',
    publisher: 'City of Boston Assessing Department',
  },
  atbGuide: {
    id: 'atbGuide',
    label: 'Real Estate Tax Appeals: A Helpful Guide for Taxpayers and Assessors',
    url: 'https://www.mass.gov/info-details/real-estate-tax-appeals-a-helpful-guide-for-taxpayers-and-assessors',
    publisher: 'Massachusetts Appellate Tax Board',
  },
  atbFiling: {
    id: 'atbFiling',
    label: 'Filing an appeal with the Appellate Tax Board',
    url: 'https://www.mass.gov/how-to/local-real-estate-tax-appeals',
    publisher: 'Massachusetts Appellate Tax Board',
  },
  mglC59s59: {
    id: 'mglC59s59',
    label: 'G.L. c. 59, § 59 — Application for abatement',
    url: 'https://malegislature.gov/Laws/GeneralLaws/PartI/TitleIX/Chapter59/Section59',
    publisher: 'Massachusetts Legislature',
  },
  mglC59s63: {
    id: 'mglC59s63',
    label: 'G.L. c. 59, § 63 — Notice of assessors’ decision or inaction',
    url: 'https://malegislature.gov/Laws/GeneralLaws/PartI/TitleIX/Chapter59/Section63',
    publisher: 'Massachusetts Legislature',
  },
  mglC59s64: {
    id: 'mglC59s64',
    label: 'G.L. c. 59, § 64 — Appeal to the Appellate Tax Board',
    url: 'https://malegislature.gov/Laws/GeneralLaws/PartI/TitleIX/Chapter59/Section64',
    publisher: 'Massachusetts Legislature',
  },
  mglC4s9: {
    id: 'mglC4s9',
    label: 'G.L. c. 4, § 9 — Deadlines falling on a Sunday or legal holiday',
    url: 'https://malegislature.gov/Laws/GeneralLaws/PartI/TitleI/Chapter4/Section9',
    publisher: 'Massachusetts Legislature',
  },
  bostonAssessmentData: {
    id: 'bostonAssessmentData',
    label: 'Property Assessment dataset (Analyze Boston)',
    url: 'https://data.boston.gov/dataset/property-assessment',
    publisher: 'City of Boston',
  },
  massLegalHelp: {
    id: 'massLegalHelp',
    label: 'MassLegalHelp — find free legal help',
    url: 'https://www.masslegalhelp.org/find-legal-aid',
    publisher: 'Massachusetts Legal Services (MassLegalHelp)',
  },
  forms: {
    id: 'forms',
    label: 'DOR taxpayer forms and guides',
    url: 'https://www.mass.gov/info-details/taxpayer-forms-and-guides',
    publisher: 'Massachusetts Department of Revenue',
  },
  fees: {
    id: 'fees',
    label: 'ATB filing fee schedule (PDF)',
    url: 'https://www.mass.gov/doc/appellate-tax-board-filing-fee-schedule/download',
    publisher: 'Massachusetts Appellate Tax Board',
  },
  atbRules: {
    id: 'atbRules',
    label: 'ATB rules of practice, including time computation (PDF)',
    url: 'https://www.mass.gov/doc/appellate-tax-board-rules-of-practice-and-procedure-0/download',
    publisher: 'Massachusetts Appellate Tax Board',
  },
  revere: {
    id: 'revere',
    label: 'Revere Assessors',
    url: 'https://www.revere.org/departments/assessors',
    publisher: 'City of Revere',
  },
  winthrop: {
    id: 'winthrop',
    label: 'Winthrop Assessing Department',
    url: 'https://winthropma.gov/158/Assessing-Department',
    publisher: 'Town of Winthrop',
  },
  chelsea: {
    id: 'chelsea',
    label: 'Chelsea Assessing information',
    url: 'https://chelseama.qscend.com/311/knowledgebase/category/1537',
    publisher: 'City of Chelsea 311',
  },
} as const satisfies Record<string, OfficialLink>

/** Published by the City of Boston on the "How to file" page (reviewed LAST_REVIEWED). */
export const BOSTON_PUBLISHED_DEADLINES: Record<
  number,
  { date: string; sourceId: keyof typeof OFFICIAL_LINKS }
> = {
  2027: { date: '2027-02-01', sourceId: 'bostonHowToFile' },
}

/**
 * Plain-language legal information. Each item cites its source. This is not
 * legal advice and does not describe every exception.
 */
export const LEGAL_RULES = [
  {
    id: 'remedy',
    title: 'The remedy is called an abatement',
    body: 'An abatement is a reduction of the tax assessed on a property for one fiscal year. It is requested by filing an application (State Tax Form 128, or the city’s online version) with the local Board of Assessors.',
    sources: ['form128', 'bostonHowToFile'],
  },
  {
    id: 'grounds',
    title: 'Common grounds for an application',
    body: 'Grounds include overvaluation (the assessed value is more than the property’s fair cash value on January 1 before the fiscal year), disproportionate assessment compared with other properties, incorrect classification, and statutory exemptions.',
    sources: ['form128', 'bostonHowToFile'],
  },
  {
    id: 'deadline',
    title: 'Filing deadline',
    body: 'For most homeowners the application must be filed on or before the date the first installment of the actual (not preliminary) tax bill is due without interest. In Boston this is the third-quarter bill; the City has published February 1, 2027 as the FY2027 deadline. A late application generally cannot be considered.',
    sources: ['mglC59s59', 'bostonHowToFile'],
  },
  {
    id: 'pay',
    title: 'Keep paying the tax while you wait',
    body: 'Filing does not pause your bills. If the tax for the fiscal year is more than $5,000, the law requires that the tax has been paid without incurring interest before an appeal to the Appellate Tax Board can result in an abatement (a three-year-average alternative exists). Paying on time protects your options.',
    sources: ['mglC59s64'],
  },
  {
    id: 'decision',
    title: 'Assessors have three months to act',
    body: 'If the Board of Assessors does not act within three months of the filing date, the application is deemed denied, unless you agreed in writing to extend that period. The assessors should then send written notice of the inaction.',
    sources: ['mglC59s63', 'mglC59s64'],
  },
  {
    id: 'atb',
    title: 'Further review at the Appellate Tax Board',
    body: 'An appeal to the Massachusetts Appellate Tax Board must generally be filed within three months after the date of the assessors’ decision, or within three months after the date the application was deemed denied.',
    sources: ['mglC59s64', 'atbFiling', 'atbGuide'],
  },
] as const satisfies ReadonlyArray<{
  id: string
  title: string
  body: string
  sources: ReadonlyArray<keyof typeof OFFICIAL_LINKS>
}>

export type OfficialLinkId = keyof typeof OFFICIAL_LINKS
