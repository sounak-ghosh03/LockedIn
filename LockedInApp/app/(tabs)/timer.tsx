/**
 * Timer tab screen.
 *
 * The timer logic lives in `app/timer.tsx` (also kept as a modal route for
 * deep-link / shortcut access from the Home screen). This tab file re-exports
 * the same component but removes the "back" button since it is now accessed
 * from the tab bar.
 *
 * We achieve this by importing the entire module and rendering it directly.
 * All state (useTimerStore, useSettingsStore, etc.) is Zustand-based and
 * shared, so both routes share the same running timer state.
 */
export { default } from "../timer";
