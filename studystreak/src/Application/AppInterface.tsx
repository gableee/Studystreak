import { NavLink } from 'react-router-dom'
import { IconContainer } from './components/IconContainer';

export function Header() {
  return (
    <header className="w-full bg-[#0A1220] backdrop-blur-xl text-white p-4 mb-4">
      <div className="container mx-auto flex justify-between items-center px-4">
        
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 
              3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 
              1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /> 
            </svg>
          </div>
          <div className="flex items-center gap-8">
            <h1 className="text-lg font-semibold text-white">
              StudyStreak
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="btn-ghost p-2 relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 
              6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-blue-500 rounded-full text-xs flex items-center justify-center font-medium">2</span>
          </button>
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg flex items-center justify-center text-sm font-medium">
            Lee
          </div>

        </div>
      </div>
    </header>
  );
}

export function SideBar() {
  return (
    <aside className="w-72 hidden md:block bg-[#0A1220]/80 backdrop-blur-xl text-white h-full border-r border-white/5">
      <nav className="h-full py-8 px-5">
        <div className="mb-8 px-4">
          <div className="text-xs font-medium text-white/50 uppercase tracking-wider">
            Main Menu
          </div>
        </div>
        <ul className="space-y-2">
          <li>
            <NavLink to="/dashboard" 
              className={({ isActive }) => `
                flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 group
                ${isActive ? 'bg-blue-500/10 text-blue-400' : 'text-white/70 hover:bg-white/5'}
              `}
            >
              <IconContainer>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white/70 group-[.active]:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8v-10h-8v10zm0-18v6h8V3h-8z" />
                </svg>
              </IconContainer>
              <div className="flex flex-col">
                <span className="font-medium">Dashboard</span>
                <span className="text-xs text-white/50">Overview & Stats</span>
              </div>
            </NavLink>
          </li>
          <li>
            <NavLink to="/profile" 
              className={({ isActive }) => `
                flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 group
                ${isActive ? 'bg-green-500/10 text-green-400' : 'text-white/70 hover:bg-white/5'}
              `}
            >
              <IconContainer>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white/70 group-[.active]:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A9 9 0 1112 21a9 9 0 01-6.879-3.196z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </IconContainer>
              <div className="flex flex-col">
                <span className="font-medium">Profile</span>
                <span className="text-xs text-white/50">Your Progress</span>
              </div>
            </NavLink>
          </li>
          <li>
            <NavLink to="/settings" 
              className={({ isActive }) => `
                flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 group
                ${isActive ? 'bg-amber-500/10 text-amber-400' : 'text-white/70 hover:bg-white/5'}
              `}
            >
              <IconContainer>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white/70 group-[.active]:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-1.14 1.603-1.14 1.902 0a1.724 1.724 0 002.573 1.01c.943-.545 2.042.454 1.497 1.398a1.724 1.724 0 001.01 2.573c1.14.3 1.14 1.603 0 1.902a1.724 1.724 0 00-1.01 2.573c.545.943-.454 2.042-1.398 1.497a1.724 1.724 0 00-2.573 1.01c-.3 1.14-1.603 1.14-1.902 0a1.724 1.724 0 00-2.573-1.01c-.943.545-2.042-.454-1.497-1.398a1.724 1.724 0 00-1.01-2.573c-1.14-.3-1.14-1.603 0-1.902a1.724 1.724 0 001.01-2.573c-.545-.943.454-2.042 1.398-1.497.943.545 2.042-.454 1.497-1.398z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </IconContainer>
              <div className="flex flex-col">
                <span className="font-medium">Settings</span>
                <span className="text-xs text-white/50">Preferences</span>
              </div>
            </NavLink>
          </li>
          <li>
            <NavLink to="/pomodoro" 
              className={({ isActive }) => `
                flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 group
                ${isActive ? 'bg-red-500/10 text-red-400' : 'text-white/70 hover:bg-white/5'}
              `}
            >
              <IconContainer>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white/70 group-[.active]:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </IconContainer>
              <div className="flex flex-col">
                <span className="font-medium">Pomodoro</span>
                <span className="text-xs text-white/50">Focus Timer</span>
              </div>
            </NavLink>
          </li>
          <li>
            <NavLink to="/courses" 
              className={({ isActive }) => `
                flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 group
                ${isActive ? 'bg-purple-500/10 text-purple-400' : 'text-white/70 hover:bg-white/5'}
              `}
            >
              <IconContainer>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white/70 group-[.active]:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </IconContainer>
              <div className="flex flex-col">
                <span className="font-medium">Courses</span>
                <span className="text-xs text-white/50">Your Learning</span>
              </div>
            </NavLink>
          </li>
          <li>
            <NavLink to="/todo" 
              className={({ isActive }) => `
                flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 group
                ${isActive ? 'bg-indigo-500/10 text-indigo-400' : 'text-white/70 hover:bg-white/5'}
              `}
            >
              <IconContainer>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white/70 group-[.active]:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </IconContainer>
              <div className="flex flex-col">
                <span className="font-medium">Todo List</span>
                <span className="text-xs text-white/50">Track Tasks</span>
              </div>
            </NavLink>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
