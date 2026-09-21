export type GlLevel = 'low' | 'medium' | 'high';

/** Standard GL bands per serving: low ≤10, medium 11–19, high ≥20. */
export function glLevel(gl: number): GlLevel {
  if (gl <= 10) return 'low';
  if (gl < 20) return 'medium';
  return 'high';
}

/** "per 1 cup cooked", or "(negligible carbohydrate)" for carb-free foods. */
export function glBasisText(glServing: string | undefined): string {
  if (!glServing) return '';
  return glServing === 'negligible carbohydrate' ? '(negligible carbohydrate)' : `per ${glServing}`;
}

export const GL_LEVEL_LABEL: Record<GlLevel, string> = { low: 'Low GL', medium: 'Medium GL', high: 'High GL' };
