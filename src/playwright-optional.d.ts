/**
 * Stub declaration for optional dependency "playwright".
 * Used when Playwright is not installed; avoids "Cannot find module 'playwright'" at compile time.
 * When Playwright is installed, its own types are used.
 */
declare module "playwright" {
  export const chromium: unknown;
  export const firefox: unknown;
  export const webkit: unknown;
}
