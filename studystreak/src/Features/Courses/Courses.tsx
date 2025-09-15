import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";

export default function Courses() {
  const [mounted, setMounted] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleImageLoad = (platformName: string) => {
    setLoadedImages(prev => ({ ...prev, [platformName]: true }));
  };

  const platforms = [
    {
      name: 'Coursera',
      url: 'https://www.coursera.org',
      logo: '/src/assets/images/Coursera-logo.svg',  // Local image path
      description: 'Online courses from top universities',
      color: 'bg-slate-800/60'
    },
    {
      name: 'Khan Academy',
      url: 'https://www.khanacademy.org',
      logo: '/src/assets/images/Khan-Academy-logo.png',
      description: 'Free world-class education for anyone',
      color: 'bg-slate-800/60'
    },
    {
      name: 'Scrimba',
      url: 'https://scrimba.com',
      logo: '/src/assets/images/Scrimba-logo.png',
      description: 'Interactive coding courses',
      color: 'bg-slate-800/60'
    },
    {
      name: 'Udemy',
      url: 'https://www.udemy.com',
      logo: 'https://www.udemy.com/staticx/udemy/images/v7/logo-udemy-inverted.svg',
      description: 'Learn on your schedule',
      color: 'bg-slate-800/60'
    },
    {
      name: 'edX',
      url: 'https://www.edx.org',
      logo: '/src/assets/images/Edx-logo.png',
      description: 'Education for everyone',
      color: 'bg-slate-800/60'
    },
    {
      name: 'freeCodeCamp',
      url: 'https://www.freecodecamp.org',
      logo: 'https://cdn.freecodecamp.org/platform/universal/fcc_primary.svg',
      description: 'Learn to code for free',
      color: 'bg-slate-800/60'
    }
  ];

  return (
    <motion.div 
      className="space-y-12 p-6 max-w-7xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: mounted ? 1 : 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Learning Platforms Section */}
      <section className="relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-72 bg-blue-600/5 blur-[120px] rounded-full -z-10"></div>
        
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white">Learning Platforms</h2>
            <p className="text-slate-400 mt-1">Continue your learning journey with these educational platforms</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {platforms.map((platform, index) => (
            <motion.div
              key={platform.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                delay: index * 0.1,
                duration: 0.4,
                ease: [0.21, 0.45, 0.42, 0.96]
              }}
            >
              <Card className={`relative overflow-hidden h-56 border border-slate-700 ${platform.color} shadow-sm 
                            hover:border-slate-500 transition-all duration-300 group`}>
                <div className="absolute inset-0 bg-[#0A1220]/20"></div>
                
                {/* Loading spinner overlay */}
                {!loadedImages[platform.name] && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#0A1220]/40 z-10">
                    <svg className="animate-spin h-6 w-6 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                )}
                
                <CardContent className="h-full p-0">
                  <a
                    href={platform.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block h-full w-full p-8"
                  >
                    <div className="h-full flex flex-col relative z-10">
                      <div className="flex items-center justify-center flex-1">
                        <img
                          src={platform.logo}
                          alt={platform.name}
                          onLoad={() => handleImageLoad(platform.name)}
                          className={`max-h-16 object-contain ${loadedImages[platform.name] ? 'opacity-100' : 'opacity-0'} 
                                     transition-opacity duration-300`}
                        />
                      </div>
                      
                      <div className="mt-auto">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-lg font-medium text-white">{platform.name}</div>
                            <div className="text-sm text-slate-400">{platform.description}</div>
                          </div>
                          <ExternalLink className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                        </div>
                      </div>
                    </div>
                  </a>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>   
    </motion.div>
  );
}