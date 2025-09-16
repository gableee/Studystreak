export default function Pomodoro() {
  return (
    <section className="p-6">
      <h2 className="text-2xl font-bold mb-6 text-foreground dark:text-slate-100">Pomodoro Timer</h2>
      
      {/* Timer Display */}
      <div className="bg-card dark:bg-slate-800 rounded-2xl p-8 mb-6 shadow-lg border border-border dark:border-transparent">
        <div className="text-6xl font-mono text-center text-card-foreground dark:text-slate-100 mb-4">
          25:00
        </div>
        <div className="flex justify-center gap-4">
          <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Start
          </button>
          <button className="px-6 py-2 bg-muted dark:bg-slate-600 text-muted-foreground dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-slate-700 transition-colors">
            Reset
          </button>
        </div>
      </div>

      {/* Session Types */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <button className="p-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">
          Pomodoro
        </button>
        <button className="p-4 bg-muted dark:bg-slate-700 text-muted-foreground dark:text-white rounded-xl hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors">
          Short Break
        </button>
        <button className="p-4 bg-muted dark:bg-slate-700 text-muted-foreground dark:text-white rounded-xl hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors">
          Long Break
        </button>
      </div>

      {/* Stats */}
      <div className="bg-card dark:bg-slate-800 rounded-xl p-6 border border-border dark:border-transparent">
        <h3 className="text-xl font-semibold mb-4 text-card-foreground dark:text-slate-100">Today's Stats</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-muted dark:bg-slate-700 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground dark:text-slate-400">Focus Time</p>
            <p className="text-2xl font-bold text-card-foreground dark:text-slate-100">2h 15m</p>
          </div>
          <div className="bg-muted dark:bg-slate-700 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground dark:text-slate-400">Pomodoros</p>
            <p className="text-2xl font-bold text-card-foreground dark:text-slate-100">5</p>
          </div>
          <div className="bg-muted dark:bg-slate-700 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground dark:text-slate-400">Breaks</p>
            <p className="text-2xl font-bold text-card-foreground dark:text-slate-100">4</p>
          </div>
        </div>
      </div>
    </section>
  );
}