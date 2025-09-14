export default function Courses() {
  const platforms = [
    {
      name: 'Coursera',
      url: 'https://www.coursera.org',
      logo: '/src/assets/images/Coursera-logo.svg',  // Local image path
      description: 'Online courses from top universities'
    },
    {
      name: 'Khan Academy',
      url: 'https://www.khanacademy.org',
      logo: '/src/assets/images/Khan-Academy-logo.png',
      description: 'Free world-class education for anyone'
    },
    {
      name: 'Scrimba',
      url: 'https://scrimba.com',
      logo: '/src/assets/images/Scrimba-logo.png',
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
      logo: '/src/assets/images/Edx-logo.png',
      description: 'Education for everyone'
    },
    {
      name: 'freeCodeCamp',
      url: 'https://www.freecodecamp.org',
      logo: 'https://cdn.freecodecamp.org/platform/universal/fcc_primary.svg',
      description: 'Learn to code for free'
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
              <div className="card card-hover aspect-[4/3]">
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
    </div>
  );
}