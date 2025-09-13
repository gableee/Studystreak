
import { Header, SideBar } from './AppInterface.tsx'
import { Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from '../Features/Dashboard/Dashboard'
import Profile from '../Features/Profile/Profile'
import Settings from '../Features/Settings/Settings'

function App() {

  return (
    <>
    <div className="flex flex-col h-screen">
      <Header />
      <div className="flex flex-1">
        <SideBar />
        <main className="flex-1 p-4">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<div className="text-slate-300">Not Found</div>} />
          </Routes>
        </main>
      </div>
    </div>
    </>
  )
}

export default App
