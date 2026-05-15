/** Google Analytics 4 measurement ID (public). Override via VITE_GA_MEASUREMENT_ID. */
export const GA_MEASUREMENT_ID =
  (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined)?.trim() || 'G-V2CM0HD0Z1';
