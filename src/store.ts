import { useEffect, useState } from 'react'
import type { ScheduleState } from './types'

export const STORAGE_KEY = 'turno360:state'

export const initialSchedule: ScheduleState = {
  workers: [],
  activities: [],
  shifts: [
    { id: 'shift-night', name: 'Recorredora · Turno 1', startTime: '22:00', endTime: '07:00' },
    { id: 'shift-morning', name: 'Recorredora · Turno 2', startTime: '07:00', endTime: '14:00' },
    { id: 'shift-afternoon', name: 'Recorredora · Turno 3', startTime: '14:00', endTime: '22:00' },
  ],
  assignments: [],
  unavailability: [],
}

function readSchedule(): ScheduleState {
  if (typeof window === 'undefined') return initialSchedule

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored ? { ...initialSchedule, ...JSON.parse(stored) } : initialSchedule
  } catch {
    return initialSchedule
  }
}

export function useScheduleStore() {
  const [schedule, setSchedule] = useState<ScheduleState>(readSchedule)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(schedule))
  }, [schedule])

  return { schedule, setSchedule }
}
