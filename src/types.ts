export type WorkerRole = 'jefe' | 'supervisor' | 'operativo'

export type Worker = {
  id: string
  name: string
  role: WorkerRole
  active: boolean
  startDate: string
  firstWeekend: 'trabaja' | 'descansa'
}

export type Activity = {
  id: string
  name: string
  durationHours: number
  minimumWorkers: number
  splitIntoShifts: boolean
}

export type Shift = {
  id: string
  name: string
  startTime: string
  endTime: string
}

export type Assignment = {
  id: string
  workerId: string
  activityId: string
  date: string
  shiftId?: string
}

export type Unavailability = {
  id: string
  workerId: string
  type: 'vacaciones' | 'permiso' | 'descanso'
  startDate: string
  endDate: string
  reason?: string
}

export type ScheduleState = {
  workers: Worker[]
  activities: Activity[]
  shifts: Shift[]
  assignments: Assignment[]
  unavailability: Unavailability[]
}
