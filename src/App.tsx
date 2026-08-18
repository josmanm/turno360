import { useState } from 'react'
import { CalendarDays, ClipboardList, LayoutGrid, Settings, Users } from 'lucide-react'
import './App.css'
import { useScheduleStore } from './store'
import WorkerManagement from './WorkerManagement'
import OperationsManagement from './OperationsManagement'
import Planner from './Planner'
import AvailabilityManagement from './AvailabilityManagement'
import DataManagement from './DataManagement'

const navItems = [
  { label: 'Planificación', icon: LayoutGrid },
  { label: 'Personal', icon: Users },
  { label: 'Actividades', icon: ClipboardList },
  { label: 'Disponibilidad', icon: CalendarDays },
  { label: 'Configuración', icon: Settings },
]

function App() {
  const { schedule, setSchedule } = useScheduleStore()
  const [activeNav, setActiveNav] = useState('Planificación')

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Ir al contenido principal</a>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">T</div>
          <div>
            <strong>Turno<span>360</span></strong>
            <small>Gestión operativa</small>
          </div>
        </div>

        <nav className="main-nav" aria-label="Navegación principal">
          <p className="nav-heading">Espacio de trabajo</p>
          {navItems.map((item) => (
            <button
              className={`nav-item ${activeNav === item.label ? 'active' : ''}`}
              key={item.label}
              onClick={() => setActiveNav(item.label)}
              type="button"
            >
              <span className="nav-icon"><item.icon size={17} strokeWidth={1.8} aria-hidden="true" /></span>
              {item.label}
              {activeNav === item.label && <span className="nav-dot" aria-hidden="true" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="storage-status"><span className="status-dot" /> Guardado local activo</div>
          <div className="profile">
            <div className="avatar">AD</div>
            <div><strong>Administrador</strong><small>Sesión local</small></div>
          </div>
        </div>
      </aside>

      <main className="main-content" id="main-content">
        <header className="topbar">
          <div className="breadcrumbs"><span>Turno360</span><b>/</b><strong>{activeNav}</strong></div>
          <div className="top-actions">
            <div className="top-avatar">AD</div>
          </div>
        </header>

        <div className="content-wrap">
          <section className="page-heading">
            <div>
              <p className="eyebrow">{activeNav === 'Planificación' ? 'Vista diaria' : 'Gestión operativa'}</p>
              <h1>{activeNav === 'Personal' ? 'Personal' : activeNav === 'Actividades' ? 'Actividades' : activeNav === 'Disponibilidad' ? 'Disponibilidad' : activeNav === 'Configuración' ? 'Configuración' : 'Planificación'}</h1>
              <p className="subtitle">{activeNav === 'Personal' ? 'Administra las personas que forman parte de tu equipo.' : activeNav === 'Actividades' ? 'Define el catálogo de labores y sus requisitos.' : activeNav === 'Disponibilidad' ? 'Gestiona vacaciones, permisos y descansos del equipo.' : activeNav === 'Configuración' ? 'Ajusta los horarios que utiliza la operación.' : 'Organiza los turnos de tu equipo de forma clara y rápida.'}</p>
            </div>
          </section>

          {activeNav === 'Personal' ? <WorkerManagement schedule={schedule} setSchedule={setSchedule} /> : activeNav === 'Actividades' ? <OperationsManagement mode="activities" schedule={schedule} setSchedule={setSchedule} /> : activeNav === 'Disponibilidad' ? <AvailabilityManagement schedule={schedule} setSchedule={setSchedule} /> : activeNav === 'Configuración' ? <><OperationsManagement mode="shifts" schedule={schedule} setSchedule={setSchedule} /><DataManagement schedule={schedule} setSchedule={setSchedule} /></> : <Planner schedule={schedule} setSchedule={setSchedule} />}

          <footer className="app-footer"><span>Turno360 · Fase {activeNav === 'Planificación' ? '4' : activeNav === 'Disponibilidad' ? '5' : '3'}</span><span>Los cambios se guardan automáticamente en este dispositivo.</span></footer>
        </div>
      </main>
    </div>
  )
}

export default App
