import { useState } from 'react'
import type { Dispatch, FormEvent, SetStateAction } from 'react'
import type { Activity, ScheduleState, Shift } from './types'

type Props = {
  mode: 'activities' | 'shifts'
  schedule: ScheduleState
  setSchedule: Dispatch<SetStateAction<ScheduleState>>
}

const activitySuggestions = ['Comisión', 'Excusados', 'Formación', 'Fundación', 'Apoyo', 'JSI', 'Polígono', 'Esquinas']
const blankActivity = { name: '', durationHours: '8', minimumWorkers: '1', splitIntoShifts: false }

function OperationsManagement({ mode, schedule, setSchedule }: Props) {
  const [activityForm, setActivityForm] = useState(blankActivity)
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const filteredActivities = schedule.activities.filter((activity) => activity.name.toLowerCase().includes(search.toLowerCase()))

  function saveActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = activityForm.name.trim()
    if (!name || Number(activityForm.durationHours) <= 0 || Number(activityForm.minimumWorkers) <= 0) return
    const values = { name, durationHours: Number(activityForm.durationHours), minimumWorkers: Number(activityForm.minimumWorkers), splitIntoShifts: activityForm.splitIntoShifts || name.toLowerCase() === 'recorredora' }
    setSchedule((current) => ({
      ...current,
      activities: editingActivityId
        ? current.activities.map((activity) => activity.id === editingActivityId ? { ...activity, ...values } : activity)
        : [...current.activities, { id: crypto.randomUUID(), ...values }],
    }))
    setActivityForm(blankActivity)
    setEditingActivityId(null)
  }

  function editActivity(activity: Activity) {
    setEditingActivityId(activity.id)
    setActivityForm({ name: activity.name, durationHours: String(activity.durationHours), minimumWorkers: String(activity.minimumWorkers), splitIntoShifts: activity.splitIntoShifts ?? activity.name.toLowerCase() === 'recorredora' })
  }

  function deleteActivity(id: string) {
    const activity = schedule.activities.find((item) => item.id === id)
    if (!window.confirm(`¿Eliminar la actividad ${activity?.name ?? 'seleccionada'}? También se quitarán sus asignaciones.`)) return
    setSchedule((current) => ({
      ...current,
      activities: current.activities.filter((activity) => activity.id !== id),
      assignments: current.assignments.filter((assignment) => assignment.activityId !== id),
    }))
    if (editingActivityId === id) {
      setEditingActivityId(null)
      setActivityForm(blankActivity)
    }
  }

  function updateShift(id: string, field: keyof Shift, value: string) {
    setSchedule((current) => ({
      ...current,
      shifts: current.shifts.map((shift) => shift.id === id ? { ...shift, [field]: value } : shift),
    }))
  }

  if (mode === 'shifts') {
    return (
      <section className="settings-card">
        <div className="operations-heading"><div><h2>Horarios de Recorredora</h2><p>Define las franjas que estarán disponibles para asignar en la planificación.</p></div><span className="saved-pill">● Guardado automático</span></div>
        <div className="shift-list">
          {schedule.shifts.map((shift, index) => (
            <div className="shift-row" key={shift.id}>
              <div className={`shift-number shift-${index + 1}`}>0{index + 1}</div>
              <div className="shift-name"><strong>{shift.name}</strong><span>Recorredora</span></div>
              <label>Inicio<input type="time" value={shift.startTime} onChange={(event) => updateShift(shift.id, 'startTime', event.target.value)} /></label>
              <span className="time-separator">a</span>
              <label>Fin<input type="time" value={shift.endTime} onChange={(event) => updateShift(shift.id, 'endTime', event.target.value)} /></label>
            </div>
          ))}
        </div>
        <div className="shift-note"><span>i</span><p>El Turno 1 cruza la medianoche. El sistema lo interpretará como un horario nocturno de 9 horas.</p></div>
      </section>
    )
  }

  return (
    <section className="operations-layout">
      <div className="operations-main">
        <div className="operations-heading"><div><h2>Catálogo de actividades</h2><p>{schedule.activities.length} actividades configuradas para la operación.</p></div><label className="search-field"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar actividad" /></label></div>
        {filteredActivities.length === 0 ? (
          <div className="management-empty"><div className="empty-user">▤</div><h3>{search ? 'No encontramos resultados' : 'Aún no hay actividades'}</h3><p>{search ? 'Prueba con otro nombre.' : 'Crea la primera actividad desde el formulario.'}</p></div>
        ) : (
          <div className="activity-list">{filteredActivities.map((activity) => <article className="activity-row" key={activity.id}><div className="activity-symbol">▤</div><div className="activity-info"><strong>{activity.name}</strong><span>{activity.durationHours} horas · {activity.splitIntoShifts ? '3 turnos' : 'jornada única'}</span></div><div className="minimum-badge"><strong>{activity.minimumWorkers}</strong><span>mínimo</span></div><div className="row-actions"><button type="button" onClick={() => editActivity(activity)}>Editar</button><button className="delete-action" type="button" onClick={() => deleteActivity(activity.id)}>Eliminar</button></div></article>)}</div>
        )}
      </div>
      <form className="worker-form" onSubmit={saveActivity}>
        <div className="form-heading"><div className="form-icon">＋</div><div><h2>{editingActivityId ? 'Editar actividad' : 'Nueva actividad'}</h2><p>Configura sus requisitos operativos.</p></div></div>
        <label>Nombre de la actividad<input required value={activityForm.name} onChange={(event) => setActivityForm({ ...activityForm, name: event.target.value })} placeholder="Ej. Formación" /></label>
        <div className="suggestions">{activitySuggestions.map((name) => <button type="button" key={name} onClick={() => setActivityForm({ ...activityForm, name })}>{name}</button>)}</div>
        <div className="form-columns"><label>Duración (horas)<input required min="0.5" step="0.5" type="number" value={activityForm.durationHours} onChange={(event) => setActivityForm({ ...activityForm, durationHours: event.target.value })} /></label><label>Personas mínimas<input required min="1" type="number" value={activityForm.minimumWorkers} onChange={(event) => setActivityForm({ ...activityForm, minimumWorkers: event.target.value })} /></label></div>
        <label className="shift-toggle"><input type="checkbox" checked={activityForm.splitIntoShifts} onChange={(event) => setActivityForm({ ...activityForm, splitIntoShifts: event.target.checked })} /><span><strong>Dividir esta actividad en turnos</strong><small>Solo actívalo cuando la labor tenga franjas independientes, como Recorredora.</small></span></label>
        <div className="form-actions"><button className="primary-button" type="submit">{editingActivityId ? 'Guardar cambios' : 'Agregar actividad'}</button>{editingActivityId && <button className="cancel-button" type="button" onClick={() => { setEditingActivityId(null); setActivityForm(blankActivity) }}>Cancelar</button>}</div>
      </form>
    </section>
  )
}

export default OperationsManagement
