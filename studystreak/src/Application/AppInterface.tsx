import React from "react";

function Header() {
  return (
    <header className="w-full bg-slate-700 text-white p-4 rounded-xl mb-4">
      <h1 className="text-2xl font-bold text-center">Header</h1>
    </header>
  );
}

function SideBar() {
  return (
    <aside className="w-54 bg-slate-700 text-white p-4 rounded-xl mr-4">
      <nav>
        <ul>
          <li className="mb-2">
            <a href="#" className="flex items-center gap-2 hover:underline">
              {/* Dashboard Icon */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8v-10h-8v10zm0-18v6h8V3h-8z" />
              </svg>
              <span className="font-bold">Dashboard</span>
            </a>
          </li>
          <li className="mb-2">
            <a href="#" className="flex items-center gap-2 hover:underline">
              {/* Profile Icon */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A9 9 0 1112 21a9 9 0 01-6.879-3.196z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="font-bold">Profile</span>
            </a>
          </li>
          <li className="mb-2">
            <a href="#" className="flex items-center gap-2 hover:underline">
              {/* Settings Icon */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-1.14 1.603-1.14 1.902 0a1.724 1.724 0 002.573 1.01c.943-.545 2.042.454 1.497 1.398a1.724 1.724 0 001.01 2.573c1.14.3 1.14 1.603 0 1.902a1.724 1.724 0 00-1.01 2.573c.545.943-.454 2.042-1.398 1.497a1.724 1.724 0 00-2.573 1.01c-.3 1.14-1.603 1.14-1.902 0a1.724 1.724 0 00-2.573-1.01c-.943.545-2.042-.454-1.497-1.398a1.724 1.724 0 00-1.01-2.573c-1.14-.3-1.14-1.603 0-1.902a1.724 1.724 0 001.01-2.573c-.545-.943.454-2.042 1.398-1.497.943.545 2.042-.454 1.497-1.398z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="font-bold">Settings</span>
            </a>
          </li>
        </ul>
      </nav>
    </aside>
  );
}

export default function AppInterface() {
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <div className="flex flex-1">
        <SideBar />
        <main className="flex-1 p-4">
          <h2 className="text-xl font-bold mb-4">Main Content Area</h2>
          {/* Add your main content here */}
        </main>
      </div>
    </div>
  );
}
