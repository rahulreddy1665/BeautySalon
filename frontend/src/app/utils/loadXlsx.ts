/**
 * Loads the spreadsheet library on demand. It's large (~400 KB) and only the
 * import dialogs need it, so it lives in its own chunk instead of the screen's.
 */
export const loadXlsx = () => import('xlsx')
