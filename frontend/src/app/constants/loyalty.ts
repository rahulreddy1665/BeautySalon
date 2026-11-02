export const LOYALTY = {
  description: 'Member balances and point adjustments.',
  adjust: 'Adjust points',
  adjustHint:
    'Manual earn, redeem, or set balance. Record a reason for the ledger.',
  members: 'Members',
  searchPlaceholder: 'Search name or phone',
  emptyMembers: 'No members yet',
  emptyMembersHint: 'Add customers to start tracking points.',
  loadFailed: 'Could not load loyalty',
  fields: {
    customer: 'Customer',
    chooseCustomer: 'Choose customer',
    type: 'Type',
    points: 'Points',
    newBalance: 'New balance',
    reason: 'Reason',
    reasonPlaceholder: 'Birthday bonus / correction…',
  },
  types: {
    earn: 'Earn (add)',
    redeem: 'Redeem (subtract)',
    set: 'Set balance',
  },
  saving: 'Saving…',
  toasts: {
    adjusted: 'Points updated',
  },
} as const
