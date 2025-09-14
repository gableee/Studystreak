export default function Dashboard() {
  const courses = [
    {
      id: 1,
      title: "Introduction to React",
      progress: 65,
      lastAccessed: "2 days ago",
      totalHours: 12,
    },
    {
      id: 2,
      title: "Advanced TypeScript",
      progress: 30,
      lastAccessed: "1 week ago",
      totalHours: 15,
    },
    {
      id: 3,
      title: "Web Development Fundamentals",
      progress: 90,
      lastAccessed: "1 day ago",
      totalHours: 20,
    }
  ];


  return (
    <div>
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-100">My Courses</h2>
          <button className="btn btn-primary">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Course
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map(course => (
            <div key={course.id} className="card card-hover">
              <h3 className="text-lg font-semibold text-slate-100 mb-3">{course.title}</h3>
              
              {/* Progress Bar */}
              <div className="w-full bg-slate-700/50 rounded-full h-2 mb-4">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${course.progress}%` }}
                />
              </div>

              <div className="flex justify-between text-sm text-slate-400 mb-4">
                <span>{course.progress}% Complete</span>
                <span>{course.totalHours} hours</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Last accessed {course.lastAccessed}</span>
                <button className="text-blue-400 hover:text-blue-300 transition-colors">
                  Continue
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card">
            <h4 className="text-sm text-slate-400 mb-2">Total Learning Time</h4>
            <p className="text-2xl font-bold text-slate-100">47 hours</p>
          </div>
          <div className="card">
            <h4 className="text-sm text-slate-400 mb-2">Courses in Progress</h4>
            <p className="text-2xl font-bold text-slate-100">3 courses</p>
          </div>
          <div className="card">
            <h4 className="text-sm text-slate-400 mb-2">Completed Courses</h4>
            <p className="text-2xl font-bold text-slate-100">5 courses</p>
          </div>
        </div>
      </section>
    </div>
  );
}