
export function Header() {
  return (
    <header className="w-full bg-slate-700 text-white p-4 rounded-xl mb-4">
      <h1 className="text-2xl font-bold text-center">Header</h1>
    </header>
  );
}

import { NavLink } from 'react-router-dom'

export function SideBar() {
  return (
    // The side bar component will contain all the link to other pages. 
    // It will be like a navigation bar but only the main content will change.
    <aside className="w-64 bg-slate-700 text-white p-4 rounded-xl mr-4">
      <nav>
        <ul>
          <li className="mb-2">
            <NavLink to="/dashboard" className={({ isActive }) => `flex items-center gap-2 ${isActive ? 'text-blue-300' : 'hover:underline'}`}>
              {/* Dashboard Icon */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8v-10h-8v10zm0-18v6h8V3h-8z" />
              </svg>
              <span className="font-bold">Dashboard</span>
            </NavLink>
          </li>
          <li className="mb-2">
            <NavLink to="/profile" className={({ isActive }) => `flex items-center gap-2 ${isActive ? 'text-green-300' : 'hover:underline'}`}>
              {/* Profile Icon */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A9 9 0 1112 21a9 9 0 01-6.879-3.196z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="font-bold">Profile</span>
            </NavLink>
          </li>
          <li className="mb-2">
            <NavLink to="/settings" className={({ isActive }) => `flex items-center gap-2 ${isActive ? 'text-yellow-300' : 'hover:underline'}`}>
              {/* Settings Icon */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-1.14 1.603-1.14 1.902 0a1.724 1.724 0 002.573 1.01c.943-.545 2.042.454 1.497 1.398a1.724 1.724 0 001.01 2.573c1.14.3 1.14 1.603 0 1.902a1.724 1.724 0 00-1.01 2.573c.545.943-.454 2.042-1.398 1.497a1.724 1.724 0 00-2.573 1.01c-.3 1.14-1.603 1.14-1.902 0a1.724 1.724 0 00-2.573-1.01c-.943.545-2.042-.454-1.497-1.398a1.724 1.724 0 00-1.01-2.573c-1.14-.3-1.14-1.603 0-1.902a1.724 1.724 0 001.01-2.573c-.545-.943.454-2.042 1.398-1.497.943.545 2.042-.454 1.497-1.398z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="font-bold">Settings</span>
            </NavLink>
          </li>
        </ul>
      </nav>
    </aside>
  );
}


