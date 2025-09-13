export default function Courses() {
  const platforms = [
    {
      name: 'Coursera',
      url: 'https://www.coursera.org',
      logo: 'https://d3njjcbhbojbot.cloudfront.net/api/utilities/v1/imageproxy/https://coursera_assets.s3.amazonaws.com/meta_images/coursera_logo_square.png',
      description: 'Online courses from top universities'
    },
    {
      name: 'Khan Academy',
      url: 'https://www.khanacademy.org',
      logo: 'https://cdn.kastatic.org/images/khan-logo-dark-background.new.png',
      description: 'Free world-class education for anyone'
    },
    {
      name: 'Scrimba',
      url: 'https://scrimba.com',
      logo: 'https://scrimba.com/static/art/dark-logo.svg',
      description: 'Interactive coding courses'
    },
    {
      name: 'Udemy',
      url: 'https://www.udemy.com',
      logo: 'https://www.udemy.com/staticx/udemy/images/v7/logo-udemy-inverted.svg',
      description: 'Learn on your schedule'
    },
    {
      name: 'edX',
      url: 'https://www.edx.org',
      logo: 'https://www.edx.org/images/logos/edx-tm-logo.svg',
      description: 'Education for everyone'
    },
    {
      name: 'freeCodeCamp',
      url: 'https://www.freecodecamp.org',
      logo: 'https://cdn.freecodecamp.org/platform/universal/fcc_primary.svg',
      description: 'Learn to code for free'
    }
  ];

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
    <div className="space-y-12 p-6">
      {/* Learning Platforms Section */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">Learning Platforms</h2>
            <p className="text-slate-400 mt-1">Continue your learning journey with these educational platforms</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
          {platforms.map((platform) => (
            <a
              key={platform.name}
              href={platform.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative overflow-hidden"
            >
              <div className="aspect-[4/3] rounded-xl bg-[#0A1220] p-6 border border-white/5 hover:border-white/10 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="h-full w-full flex items-center justify-center">
                  <img
                    src={platform.logo}
                    alt={platform.name}
                    className="w-full h-full object-contain filter brightness-90 group-hover:brightness-100 transition-all duration-300"
                  />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-black/80 to-black/0">
                  <div className="text-sm font-medium text-white/90">{platform.name}</div>
                  <div className="text-xs text-white/50">{platform.description}</div>
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* My Courses Section */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-100">My Courses</h2>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Course
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map(course => (
            <div key={course.id} className="bg-[#0A1220] rounded-xl p-6 border border-white/5 hover:border-white/10 transition-all duration-300">
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
          <div className="bg-[#0A1220] p-6 rounded-xl border border-white/5">
            <h4 className="text-sm text-slate-400 mb-2">Total Learning Time</h4>
            <p className="text-2xl font-bold text-slate-100">47 hours</p>
          </div>
          <div className="bg-[#0A1220] p-6 rounded-xl border border-white/5">
            <h4 className="text-sm text-slate-400 mb-2">Courses in Progress</h4>
            <p className="text-2xl font-bold text-slate-100">3 courses</p>
          </div>
          <div className="bg-[#0A1220] p-6 rounded-xl border border-white/5">
            <h4 className="text-sm text-slate-400 mb-2">Completed Courses</h4>
            <p className="text-2xl font-bold text-slate-100">5 courses</p>
          </div>
        </div>
      </section>
    </div>
  );
}