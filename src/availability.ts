import type { ScheduleState } from './types'

function dayNumber(value: string) {
  return Math.floor(new Date(`${value}T12:00:00`).getTime() / 86400000)
}

export function isAutomaticRest(workerStartDate: string, date: string, firstWeekend: 'trabaja' | 'descansa' = 'trabaja') {
  const current = new Date(`${date}T12:00:00`)
  const day = current.getDay()
  if (day !== 0 && day !== 6) return false

  const start = new Date(`${workerStartDate}T12:00:00`)
  const startDay = start.getDay()
  start.setDate(start.getDate() - (startDay === 0 ? 6 : startDay - 1))
  const weekNumber = Math.floor((dayNumber(date) - dayNumber(start.toISOString().slice(0, 10))) / 7)
  const restsOnFirstWeekend = firstWeekend === 'descansa'
  return weekNumber >= 0 && (restsOnFirstWeekend ? weekNumber % 2 === 0 : weekNumber % 2 === 1)
}

export function isWorkerUnavailable(schedule: ScheduleState, workerId: string, date: string) {
  const worker = schedule.workers.find((item) => item.id === workerId)
  if (!worker) return true
  return isAutomaticRest(worker.startDate, date, worker.firstWeekend ?? 'trabaja') || schedule.unavailability.some((item) => item.workerId === workerId && date >= item.startDate && date <= item.endDate)
}

export function addDays(value: string, amount: number) {
  const date = new Date(`${value}T12:00:00`)
  date.setDate(date.getDate() + amount)
  return date.toISOString().slice(0, 10)
}
