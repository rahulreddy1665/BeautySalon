import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

/** System follows OS preference until the user picks Light/Dark. */
export type ThemeMode = 'light' | 'dark' | 'system'

export interface SettingsState {
  themeMode: ThemeMode
  sidebarCollapsed: boolean
}

const initialState: SettingsState = {
  themeMode: 'system',
  sidebarCollapsed: false,
}

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setThemeMode: (state, action: PayloadAction<ThemeMode>) => {
      state.themeMode = action.payload
    },
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload
    },
  },
})

export const { setThemeMode, toggleSidebar, setSidebarCollapsed } = settingsSlice.actions
export default settingsSlice.reducer
