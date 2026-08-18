import { useRef, useState } from 'react'
import type { Dispatch, DragEvent, SetStateAction } from 'react'
import { isWorkerUnavailable } from './availability'
import { toPng } from 'html-to-image'
import type { Assignment, ScheduleState, Worker, WorkerRole } from './types'

type Props = {
  schedule: ScheduleState
  setSchedule: Dispatch<SetStateAction<ScheduleState>>
}

const roleClass = { jefe: 'role-blue', supervisor: 'role-yellow', operativo: 'role-orange' } as const
const roleName = { jefe: 'Jefe', supervisor: 'Supervisor', operativo: 'Operativo' } as const

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function parseDate(value: string) {
  return new Date(`${value}T12:00:00`)
}

function addDays(date: Date, amount: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

function shortDate(date: Date) {
  return new Intl.DateTimeFormat('es-CO', { weekday: 'short', day: 'numeric' }).format(date).replace('.', '')
}

function Planner({ schedule, setSchedule }: Props) {
  const [selectedDate, setSelectedDate] = useState('2026-08-17')
  const [search, setSearch] = useState('')
  const [draggedWorker, setDraggedWorker] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [relocationTargets, setRelocationTargets] = useState<Record<string, string>>({})
  const [quickWorkerId, setQuickWorkerId] = useState<string | null>(null)
  const [quickActivityId, setQuickActivityId] = useState('')
  const [roleFilter, setRoleFilter] = useState<WorkerRole | 'todos'>('todos')
  const [activityFilter, setActivityFilter] = useState('todos')
  const plannerRef = useRef<HTMLElement>(null)

  const selected = parseDate(selectedDate)
  const dates = [selected]
  const visibleWorkers = schedule.workers.filter((worker) => worker.active && worker.name.toLowerCase().includes(search.toLowerCase()) && (roleFilter === 'todos' || worker.role === roleFilter))
  const assignedWorkerIds = new Set(schedule.assignments.filter((assignment) => assignment.date === selectedDate).map((assignment) => assignment.workerId))
  const unavailableWorkerIds = new Set(schedule.workers.filter((worker) => isWorkerUnavailable(schedule, worker.id, selectedDate)).map((worker) => worker.id))
  const freeWorkers = schedule.workers.filter((worker) => worker.active && !assignedWorkerIds.has(worker.id) && !unavailableWorkerIds.has(worker.id)).length
  const totalAssignments = schedule.assignments.filter((assignment) => assignment.date === selectedDate).length
  const conflictingAssignments = schedule.assignments.filter((assignment) => assignment.date === selectedDate && isWorkerUnavailable(schedule, assignment.workerId, selectedDate))
  const activeWorkers = schedule.workers.filter((worker) => worker.active)
  const freeWorkerList = activeWorkers.filter((worker) => !assignedWorkerIds.has(worker.id) && !unavailableWorkerIds.has(worker.id))
  const busyWorkerList = activeWorkers.filter((worker) => assignedWorkerIds.has(worker.id))
  const unavailableWorkerList = activeWorkers.filter((worker) => unavailableWorkerIds.has(worker.id))
  const activityReport = schedule.activities.map((activity) => {
    const assignments = schedule.assignments.filter((assignment) => assignment.date === selectedDate && assignment.activityId === activity.id)
    return { activity, assigned: assignments.length, missing: Math.max(activity.minimumWorkers - assignments.length, 0), hours: assignments.length * activity.durationHours }
  })
  const incompleteActivities = activityReport.filter((item) => item.missing > 0)
  const assignedHours = (activityFilter === 'todos' ? activityReport : activityReport.filter((item) => item.activity.id === activityFilter)).reduce((total, item) => total + item.hours, 0)
  const filteredActivityReport = activityFilter === 'todos' ? activityReport : activityReport.filter((item) => item.activity.id === activityFilter)

  function changePeriod(amount: number) {
    setSelectedDate(dateKey(addDays(selected, amount)))
  }

  function startDrag(event: DragEvent<HTMLDivElement>, workerId: string) {
    event.dataTransfer.setData('workerId', workerId)
    event.dataTransfer.effectAllowed = 'move'
    setDraggedWorker(workerId)
  }

  function assignWorkerToActivity(workerId: string, activityId: string) {
    const worker = schedule.workers.find((item) => item.id === workerId)
    const activity = schedule.activities.find((item) => item.id === activityId)
    if (!worker || !activity) return setNotice('Selecciona una actividad válida.')
    if (!worker.active) return setNotice(`${worker.name} está inactivo.`)
    if (isWorkerUnavailable(schedule, workerId, selectedDate)) return setNotice(`${worker.name} no está disponible en esa fecha.`)
    if (schedule.assignments.some((item) => item.workerId === workerId && item.date === selectedDate)) return setNotice(`${worker.name} ya tiene una actividad asignada ese día.`)

    const shiftId = activity.splitIntoShifts ? schedule.shifts[0]?.id : undefined
    const assignment: Assignment = { id: crypto.randomUUID(), workerId, activityId, date: selectedDate, ...(shiftId ? { shiftId } : {}) }
    setSchedule((current) => ({ ...current, assignments: [...current.assignments, assignment] }))
    setQuickWorkerId(null)
    setQuickActivityId('')
    setNotice(`${worker.name} fue asignado correctamente.`)
  }

  function dropWorker(event: DragEvent<HTMLDivElement>, date: Date, activityId: string, _shiftId: string) {
    event.preventDefault()
    const workerId = event.dataTransfer.getData('workerId')
    const dateValue = dateKey(date)
    if (!workerId) return
    if (dateValue !== selectedDate) return setNotice('Selecciona el día que deseas planificar.')
    assignWorkerToActivity(workerId, activityId)
    setDraggedWorker(null)
  }

  function removeAssignment(id: string) {
    setSchedule((current) => ({ ...current, assignments: current.assignments.filter((assignment) => assignment.id !== id) }))
    setNotice('Asignación eliminada.')
  }

  function relocateAssignment(assignment: Assignment) {
    const targetWorkerId = relocationTargets[assignment.id]
    const targetWorker = schedule.workers.find((person) => person.id === targetWorkerId)
    const currentWorker = schedule.workers.find((person) => person.id === assignment.workerId)
    if (!targetWorker || !currentWorker) return setNotice('Selecciona una persona de reemplazo.')
    if (isWorkerUnavailable(schedule, targetWorker.id, assignment.date)) return setNotice(`${targetWorker.name} no está disponible ese día.`)
    const duplicate = schedule.assignments.some((item) => item.id !== assignment.id && item.workerId === targetWorker.id && item.date === assignment.date)
    if (duplicate) return setNotice(`${targetWorker.name} ya tiene otra actividad asignada ese día.`)
    setSchedule((current) => ({ ...current, assignments: current.assignments.map((item) => item.id === assignment.id ? { ...item, workerId: targetWorker.id } : item) }))
    setRelocationTargets((current) => { const next = { ...current }; delete next[assignment.id]; return next })
    setNotice(`${currentWorker.name} fue reemplazado por ${targetWorker.name}.`)
  }

  async function exportImage() {
    if (!plannerRef.current) return
    try {
      const dataUrl = await toPng(plannerRef.current, { cacheBust: true, pixelRatio: 2 })
      const link = document.createElement('a')
      link.download = `turno360-${selectedDate}.png`
      link.href = dataUrl
      link.click()
      setNotice('Imagen de la planificación descargada.')
    } catch {
      setNotice('No se pudo generar la imagen. Intenta nuevamente.')
    }
  }

  function exportReport() {
    const rows = [['Fecha', 'Actividad', 'Personas asignadas', 'Mínimo requerido', 'Horas asignadas'], ...filteredActivityReport.map((item) => [selectedDate, item.activity.name, String(item.assigned), String(item.activity.minimumWorkers), String(item.hours)])]
    const csv = `\uFEFF${rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(';')).join('\n')}`
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    link.download = `turno360-reporte-${selectedDate}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
    setNotice('Reporte diario descargado.')
  }

  function getAssignments(date: Date, activityId: string, shiftId?: string) {
    return schedule.assignments.filter((assignment) => assignment.date === dateKey(date) && assignment.activityId === activityId && assignment.shiftId === shiftId)
  }

  function getActivityCount(date: Date, activityId: string) {
    return schedule.assignments.filter((assignment) => assignment.date === dateKey(date) && assignment.activityId === activityId).length
  }

  const periodLabel = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(selected)

  return (
    <section className="planner-screen" ref={plannerRef}>
      <div className="planner-summary">
        <div><h2>Horario de trabajo</h2><p>Arrastra una persona hacia una actividad para asignar su turno.</p></div>
        <div className="planner-controls"><label className="search-field"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar persona" /></label><select className="filter-select" aria-label="Filtrar por rol" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as WorkerRole | 'todos')}><option value="todos">Todos los roles</option><option value="jefe">Jefes</option><option value="supervisor">Supervisores</option><option value="operativo">Operativos</option></select><button className="secondary-button" type="button" onClick={exportImage}>⇩ Exportar PNG</button></div>
      </div>
      <div className="period-bar"><button type="button" onClick={() => changePeriod(-1)} aria-label="Día anterior">‹</button><strong>{periodLabel}</strong><button type="button" onClick={() => changePeriod(1)} aria-label="Día siguiente">›</button><button className="today-button" type="button" onClick={() => setSelectedDate(dateKey(new Date()))}>Ir a hoy</button><span className="period-count">{totalAssignments} asignaciones</span></div>
      <div className="daily-stats"><div><span className="daily-stat-icon free">✓</span><span><strong>{freeWorkers}</strong><small>Libres</small></span></div><div><span className="daily-stat-icon busy">◷</span><span><strong>{assignedWorkerIds.size}</strong><small>Ocupadas</small></span></div><div><span className="daily-stat-icon unavailable">×</span><span><strong>{unavailableWorkerIds.size}</strong><small>No disponibles</small></span></div><p>Total activo: <strong>{schedule.workers.filter((worker) => worker.active).length}</strong></p></div>
      {notice && <div className="planner-notice" role="status" aria-live="polite"><span>i</span>{notice}<button type="button" onClick={() => setNotice('')}>×</button></div>}
      {conflictingAssignments.length > 0 && <div className="conflict-panel"><div className="conflict-panel-heading"><span>!</span><div><strong>Asignaciones que requieren atención</strong><small>Estas personas no están disponibles. Selecciona un reemplazo libre.</small></div></div><div className="conflict-list">{conflictingAssignments.map((assignment) => { const worker = schedule.workers.find((person) => person.id === assignment.workerId); const currentActivity = schedule.activities.find((activity) => activity.id === assignment.activityId); return <div className="conflict-item" key={assignment.id}><div><strong>{worker?.name ?? 'Persona'}</strong><small>{currentActivity?.name ?? 'Actividad'} · conflicto</small></div><select aria-label={`Persona de reemplazo para ${worker?.name ?? 'persona'}`} value={relocationTargets[assignment.id] ?? ''} onChange={(event) => setRelocationTargets((current) => ({ ...current, [assignment.id]: event.target.value }))}><option value="">Seleccionar reemplazo</option>{schedule.workers.filter((person) => person.active && person.id !== assignment.workerId && !isWorkerUnavailable(schedule, person.id, selectedDate) && !assignedWorkerIds.has(person.id)).map((person) => <option value={person.id} key={person.id}>{person.name}</option>)}</select><button className="relocate-button" type="button" disabled={!relocationTargets[assignment.id]} onClick={() => relocateAssignment(assignment)}>Reemplazar</button><button className="remove-conflict" type="button" onClick={() => removeAssignment(assignment.id)}>Quitar</button></div>})}</div></div>}
      <div className="planner-board">
        <aside className="roster-panel"><div className="roster-header"><strong>Personal del día</strong><span>{visibleWorkers.length}</span></div><p>Arrastra una persona libre o usa Asignar.</p><div className="roster-list">{visibleWorkers.map((worker) => { const status = unavailableWorkerIds.has(worker.id) ? 'unavailable' : assignedWorkerIds.has(worker.id) ? 'busy' : 'free'; return <div key={worker.id}><WorkerCard worker={worker} status={status} dragging={draggedWorker === worker.id} canQuickAssign={schedule.activities.length > 0} onQuickAssign={() => { setQuickWorkerId(worker.id); setQuickActivityId('') }} onDragStart={startDrag} />{quickWorkerId === worker.id && status === 'free' && <div className="quick-assign-form"><select aria-label={`Actividad para ${worker.name}`} value={quickActivityId} onChange={(event) => setQuickActivityId(event.target.value)}><option value="">Seleccionar actividad</option>{schedule.activities.map((activity) => <option value={activity.id} key={activity.id}>{activity.name}</option>)}</select><button type="button" disabled={!quickActivityId} onClick={() => assignWorkerToActivity(worker.id, quickActivityId)}>Asignar</button></div>}</div> })}{visibleWorkers.length === 0 && <div className="roster-empty">Registra personas para comenzar.</div>}</div></aside>
        <div className="calendar-board single-day">
          <div className="calendar-days">{dates.map((date) => { const today = dateKey(date) === dateKey(new Date()); return <div className={`calendar-day-heading selected-day ${today ? 'current-day' : ''}`} key={dateKey(date)}><span>{shortDate(date)}</span><small>{today ? 'Hoy' : 'Día seleccionado'}</small></div> })}</div>
          {schedule.activities.length === 0 ? <div className="calendar-empty"><div>▤</div><h3>No hay actividades configuradas</h3><p>Ve a la sección Actividades para crear las labores del equipo.</p></div> : <div className="calendar-columns">{dates.map((date) => <div className="calendar-column" key={dateKey(date)}>{schedule.activities.map((activity) => { const count = getActivityCount(date, activity.id); return <div className={`activity-block ${count < activity.minimumWorkers ? 'below-minimum' : 'meets-minimum'}`} key={activity.id}><div className="activity-title"><strong>{activity.name}</strong><span>{count}/{activity.minimumWorkers} mínimo</span></div>{(activity.splitIntoShifts ? schedule.shifts : [undefined]).map((shift) => <DropSlot key={shift?.id ?? 'single'} date={date} activityId={activity.id} shiftId={shift?.id} shift={shift} durationHours={activity.durationHours} assignments={getAssignments(date, activity.id, shift?.id)} workers={schedule.workers} schedule={schedule} onDrop={dropWorker} onDragOver={(event) => event.preventDefault()} onRemove={removeAssignment} />)}</div> })}</div>)}</div>}
        </div>
      </div>
      <section className="daily-report"><div className="report-heading"><div><h2>Resumen del día</h2><p>Indicadores operativos para la fecha seleccionada.</p></div><div className="report-heading-actions"><select className="filter-select" aria-label="Filtrar reporte por actividad" value={activityFilter} onChange={(event) => setActivityFilter(event.target.value)}><option value="todos">Todas las actividades</option>{schedule.activities.map((activity) => <option value={activity.id} key={activity.id}>{activity.name}</option>)}</select><button className="secondary-button" type="button" onClick={exportReport}>⇩ CSV</button><span>{selectedDate}</span></div></div><div className="report-grid"><div className="report-panel"><h3>Disponibilidad</h3><div className="report-total"><strong>{activeWorkers.length}</strong><span>personas activas</span></div><div className="report-person-group"><div><span className="report-dot free" />Libres <strong>{freeWorkerList.length}</strong></div><p>{freeWorkerList.length ? freeWorkerList.map((worker) => worker.name).join(', ') : 'No hay personas libres.'}</p></div><div className="report-person-group"><div><span className="report-dot busy" />Ocupadas <strong>{busyWorkerList.length}</strong></div><p>{busyWorkerList.length ? busyWorkerList.map((worker) => worker.name).join(', ') : 'Nadie asignado.'}</p></div><div className="report-person-group"><div><span className="report-dot unavailable" />No disponibles <strong>{unavailableWorkerList.length}</strong></div><p>{unavailableWorkerList.length ? unavailableWorkerList.map((worker) => worker.name).join(', ') : 'Ninguna.'}</p></div></div><div className="report-panel"><h3>Cobertura de actividades</h3><div className="report-total"><strong>{assignedHours}</strong><span>horas asignadas</span></div>{filteredActivityReport.length === 0 ? <p className="report-empty">No hay actividades configuradas.</p> : <div className="report-activity-list">{filteredActivityReport.map((item) => <div className={`report-activity ${item.missing ? 'incomplete' : 'complete'}`} key={item.activity.id}><div><strong>{item.activity.name}</strong><small>{item.assigned}/{item.activity.minimumWorkers} personas · {item.hours} h</small></div><span>{item.missing ? `Faltan ${item.missing}` : 'Completa'}</span></div>)}</div>}</div><div className={`report-panel report-alerts ${incompleteActivities.length || conflictingAssignments.length ? 'has-alerts' : ''}`}><h3>Atención requerida</h3>{conflictingAssignments.length > 0 && <div className="report-alert"><strong>{conflictingAssignments.length} conflicto{conflictingAssignments.length === 1 ? '' : 's'}</strong><span>Revisa las asignaciones marcadas en rojo.</span></div>}{incompleteActivities.length > 0 && <div className="report-alert"><strong>{incompleteActivities.length} actividad{incompleteActivities.length === 1 ? '' : 'es'} incompleta{incompleteActivities.length === 1 ? '' : 's'}</strong><span>Agrega personal para cumplir los mínimos.</span></div>}{!conflictingAssignments.length && !incompleteActivities.length && <div className="report-clear"><strong>✓ Todo en orden</strong><span>No hay alertas para este día.</span></div>}</div></div></section>
    </section>
  )
}

function WorkerCard({ worker, status, dragging, canQuickAssign, onQuickAssign, onDragStart }: { worker: Worker; status: 'free' | 'busy' | 'unavailable'; dragging: boolean; canQuickAssign: boolean; onQuickAssign: () => void; onDragStart: (event: DragEvent<HTMLDivElement>, id: string) => void }) {
  const statusLabels = { free: 'Libre', busy: 'Ocupada', unavailable: 'No disponible' }
  return <div className={`roster-worker ${dragging ? 'dragging' : ''} ${status}`} draggable={status === 'free'} onDragStart={(event) => onDragStart(event, worker.id)}><div className={`worker-avatar ${roleClass[worker.role]}`}>{worker.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div><div><strong>{worker.name}</strong><span className={`role-label ${roleClass[worker.role]}`}>{roleName[worker.role]}</span></div><span className={`availability-mini ${status}`}>{statusLabels[status]}</span>{status === 'free' && <span className="drag-handle">⋮⋮</span>}{status === 'free' && canQuickAssign && <button className="quick-assign-button" type="button" onClick={(event) => { event.stopPropagation(); onQuickAssign() }}>Asignar</button>}</div>
}

function DropSlot({ date, activityId, shiftId, shift, durationHours, assignments, workers, schedule, onDrop, onDragOver, onRemove }: { date: Date; activityId: string; shiftId?: string; shift?: ScheduleState['shifts'][number]; durationHours: number; assignments: Assignment[]; workers: Worker[]; schedule: ScheduleState; onDrop: (event: DragEvent<HTMLDivElement>, date: Date, activityId: string, shiftId: string) => void; onDragOver: (event: DragEvent<HTMLDivElement>) => void; onRemove: (id: string) => void }) {
  return <div className="drop-slot" onDrop={(event) => onDrop(event, date, activityId, shiftId ?? 'single')} onDragOver={onDragOver}><div className="slot-time">{shift ? <><span>{shift.startTime}</span><small>{shift.endTime}</small></> : <><span>Único</span><small>{durationHours} h</small></>}</div><div className="slot-assignments">{assignments.map((assignment) => { const worker = workers.find((item) => item.id === assignment.workerId); const conflict = worker ? isWorkerUnavailable(schedule, worker.id, dateKey(date)) : false; return worker ? <div className={`assigned-worker ${roleClass[worker.role]} ${conflict ? 'conflict' : ''}`} key={assignment.id}><span>{worker.name}{conflict && ' · conflicto'}</span><button type="button" onClick={() => onRemove(assignment.id)}>×</button></div> : null })}{assignments.length === 0 && <span className="drop-hint">Suelta aquí</span>}</div></div>
}

export default Planner
