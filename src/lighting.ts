import type { LightingSettings } from './model'

export const DEFAULT_LIGHTING: LightingSettings = { hour: 12, shadows: true }

export function formatTime(hour: number): string {
  const minutes = Math.round(hour * 60) % 1440
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

export function parseTime(value: string): number | null {
  if (value === '24:00') return 24
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value)
  return match ? Number(match[1]) + Number(match[2]) / 60 : null
}

// A visual sun path, with the user's fixed 05:00–19:00 daylight hours.
// Coordinates describe a direction relative to the center of the home.
export function lightingAt({ hour, shadows }: LightingSettings) {
  const night = hour < 5 || hour >= 19
  const phase = Math.max(0, Math.min(1, (hour - 5) / 14)) * Math.PI
  const daylight = night ? 0 : Math.sin(phase)
  const sunPosition: [number, number, number] = [18 * Math.cos(phase), 2 + 16 * daylight, -8]
  return {
    night,
    daylight,
    sunPosition,
    sunIntensity: night ? 0 : 0.35 + 2.35 * Math.pow(daylight, 0.6),
    castShadow: !night && shadows,
    ambientIntensity: night ? 0.65 : 0.36 + 0.06 * daylight,
    hemisphereIntensity: night ? 0.7 : 0.85,
  }
}
