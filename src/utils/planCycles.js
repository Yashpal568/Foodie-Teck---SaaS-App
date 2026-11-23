export const BILLING_CYCLES = {
  MONTHLY: {
    id: 'MONTHLY',
    label: 'Monthly',
    sublabel: '30 Days',
    durationDays: 30,
    unitText: '/ Month',
    monthsCount: 1,
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  '3_MONTHS': {
    id: '3_MONTHS',
    label: '3 Months / Quarterly',
    sublabel: '90 Days',
    durationDays: 90,
    unitText: '/ 3 Months',
    monthsCount: 3,
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  },
  '6_MONTHS': {
    id: '6_MONTHS',
    label: '6 Months (Semi-Annual)',
    sublabel: '180 Days',
    durationDays: 180,
    unitText: '/ 6 Months',
    monthsCount: 6,
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200'
  },
  ANNUALLY: {
    id: 'ANNUALLY',
    label: 'Annually / 1 Year',
    sublabel: '365 Days',
    durationDays: 365,
    unitText: '/ Year',
    monthsCount: 12,
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200'
  },
  CUSTOM: {
    id: 'CUSTOM',
    label: 'Custom Duration',
    sublabel: 'Custom Days',
    durationDays: 90,
    unitText: '/ Cycle',
    monthsCount: 3,
    badgeColor: 'bg-slate-50 text-slate-700 border-slate-200'
  }
}

export function parsePlanCycle(plan = {}) {
  const desc = plan.description || plan.desc || ''
  const name = (plan.name || '').toLowerCase()
  const price = Number(plan.price || 0)
  
  // 1. Check for explicit embedded tag: [CYCLE:<CADENCE>:<DAYS>]
  const match = desc.match(/\[CYCLE:([A-Z0-9_]+):?(\d+)?\]/i)
  if (match) {
    const rawCycle = match[1].toUpperCase()
    const rawDays = match[2] ? parseInt(match[2]) : null
    const cleanDesc = desc.replace(/\[CYCLE:[A-Z0-9_]+:?\d*\]/i, '').trim()
    const cycleMeta = BILLING_CYCLES[rawCycle] || BILLING_CYCLES['3_MONTHS']
    const durationDays = rawDays || cycleMeta.durationDays
    
    return {
      cycleId: rawCycle,
      cycle: cycleMeta,
      durationDays: durationDays,
      cleanDescription: cleanDesc,
      unitText: cycleMeta.unitText,
      monthlyEquivalent: Math.round(price / Math.max(1, durationDays / 30))
    }
  }

  // 2. Intelligent inference from plan name / description
  let cycleKey = '3_MONTHS'
  let durationDays = 90

  if (name.includes('year') || name.includes('annual') || desc.toLowerCase().includes('annual')) {
    cycleKey = 'ANNUALLY'
    durationDays = 365
  } else if (name.includes('6 month') || name.includes('semi-annual') || name.includes('half')) {
    cycleKey = '6_MONTHS'
    durationDays = 180
  } else if (name.includes('3 month') || name.includes('quarter') || desc.toLowerCase().includes('3-month')) {
    cycleKey = '3_MONTHS'
    durationDays = 90
  } else if (name.includes('month') || desc.toLowerCase().includes('monthly')) {
    cycleKey = 'MONTHLY'
    durationDays = 30
  }

  const cycleMeta = BILLING_CYCLES[cycleKey] || BILLING_CYCLES['3_MONTHS']
  return {
    cycleId: cycleKey,
    cycle: cycleMeta,
    durationDays: durationDays,
    cleanDescription: desc,
    unitText: cycleMeta.unitText,
    monthlyEquivalent: Math.round(price / Math.max(1, durationDays / 30))
  }
}

export function encodePlanDescription(cleanDesc, cycleId, durationDays) {
  const sanitized = (cleanDesc || '').replace(/\[CYCLE:[A-Z0-9_]+:?\d*\]/i, '').trim()
  return `${sanitized} [CYCLE:${cycleId}:${durationDays}]`.trim()
}
