export default function Todo() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Todo List</h2>
          <p className="text-slate-400 mt-1">Keep track of your tasks and deadlines</p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Task
        </button>
      </div>

      <div className="grid gap-4">
        {/* Example tasks - these will be dynamic later */}
        <div className="bg-[#0A1220] rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <input type="checkbox" className="w-5 h-5 rounded border-white/20 bg-white/5 checked:bg-indigo-600 focus:ring-indigo-600" />
            </div>
            <div className="flex-grow">
              <h3 className="text-slate-100 font-medium">Complete React Hooks Tutorial</h3>
              <p className="text-sm text-slate-400 mt-1">Watch and practice with the examples from Scrimba</p>
            </div>
            <div className="flex-shrink-0 text-right">
              <span className="text-xs text-indigo-400 font-medium px-2 py-1 bg-indigo-500/10 rounded">Today</span>
            </div>
          </div>
        </div>

        <div className="bg-[#0A1220] rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <input type="checkbox" className="w-5 h-5 rounded border-white/20 bg-white/5 checked:bg-indigo-600 focus:ring-indigo-600" />
            </div>
            <div className="flex-grow">
              <h3 className="text-slate-100 font-medium">TypeScript Assignment</h3>
              <p className="text-sm text-slate-400 mt-1">Complete advanced types exercise from Udemy course</p>
            </div>
            <div className="flex-shrink-0 text-right">
              <span className="text-xs text-yellow-400 font-medium px-2 py-1 bg-yellow-500/10 rounded">Tomorrow</span>
            </div>
          </div>
        </div>

        <div className="bg-[#0A1220] rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <input type="checkbox" className="w-5 h-5 rounded border-white/20 bg-white/5 checked:bg-indigo-600 focus:ring-indigo-600" />
            </div>
            <div className="flex-grow">
              <h3 className="text-slate-100 font-medium">CSS Grid Practice</h3>
              <p className="text-sm text-slate-400 mt-1">Complete freeCodeCamp's Grid challenges</p>
            </div>
            <div className="flex-shrink-0 text-right">
              <span className="text-xs text-red-400 font-medium px-2 py-1 bg-red-500/10 rounded">Overdue</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <div className="bg-[#0A1220] p-6 rounded-xl border border-white/5">
          <h4 className="text-sm text-slate-400 mb-2">Tasks Completed</h4>
          <p className="text-2xl font-bold text-slate-100">12 / 15</p>
        </div>
        <div className="bg-[#0A1220] p-6 rounded-xl border border-white/5">
          <h4 className="text-sm text-slate-400 mb-2">Due Today</h4>
          <p className="text-2xl font-bold text-slate-100">3</p>
        </div>
        <div className="bg-[#0A1220] p-6 rounded-xl border border-white/5">
          <h4 className="text-sm text-slate-400 mb-2">Completion Rate</h4>
          <p className="text-2xl font-bold text-slate-100">80%</p>
        </div>
      </div>
    </div>
  );
}