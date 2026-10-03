export const LOYALTY = {
  description: 'Earn and redeem rules, member balances, and points ledger.',
  adjust: 'Adjust points',
  members: 'Members',
  ledger: 'Ledger',
  rules: 'Rules',
  stats: {
    members: 'Members',
    withPoints: 'With points',
    outstanding: 'Points outstanding',
    liability: 'Est. redeem liability',
  },
  rulesForm: {
    enabled: 'Loyalty enabled',
    earn: 'Points per ₹100',
    redeemValue: '₹ value per point',
    minRedeem: 'Minimum redeem points',
    maxPercent: 'Max redeem % of net',
    expiry: 'Points expiry (days)',
    save: 'Save rules',
  },
  emptyMembers: 'No members with points yet',
  emptyLedger: 'No ledger entries yet',
  loadFailed: 'Could not load loyalty',
  toasts: {
    rulesSaved: 'Loyalty rules saved',
    adjusted: 'Points updated',
  },
} as const
