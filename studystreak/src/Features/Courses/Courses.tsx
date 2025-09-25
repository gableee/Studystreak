/**
 * Courses Component
 * 
 * This component displays a grid of educational platform cards that users can access
 * for their learning. Each platform card shows the platform logo, name, description, 
 * and a link to the external site.
 * 
 * Features:
 * - Responsive grid layout
 * - Image loading states with spinner
 * - Hover effects for interactive feedback
 * - External links to learning platforms
 * 
 * @module Features/Courses
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";

export default function Courses() {
  /**
   * State to track which platform images have finished loading
   * Key: platform name, Value: boolean indicating if image is loaded
   */
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});
  
  /**
   * Handler function called when a platform image finishes loading
   * Updates the loadedImages state to hide the loading spinner and show the image
   * 
   * @param platformName - The name of the platform whose image has loaded
   */
  const handleImageLoad = (platformName: string) => {
    setLoadedImages(prev => ({ ...prev, [platformName]: true }));
  };

  /**
   * Array of learning platforms displayed in the course grid
   * Each platform object contains:
   * - name: Display name of the platform
   * - url: External URL to the platform website
   * - logo: Path to the platform logo image
   * - description: Short description of what the platform offers
   * - color: Background color class for the platform card
   */
  const platforms = [
    {
      name: 'Coursera',
      url: 'https://www.coursera.org',
      logo: '/src/assets/images/Coursera-logo.svg',  // Local image path
      description: 'Online courses from top universities',
      color: 'bg-card dark:bg-[#0A1220]'
    },
    {
      name: 'Khan Academy',
      url: 'https://www.khanacademy.org',
      logo: '/src/assets/images/Khan-Academy-logo.png',
      description: 'Free world-class education for anyone',
      color: 'bg-card dark:bg-[#0A1220]'
    },
    {
      name: 'Scrimba',
      url: 'https://scrimba.com',
      logo: '/src/assets/images/Scrimba-logo.png',
      description: 'Interactive coding courses',
      color: 'bg-card dark:bg-[#0A1220]'
    },
    {
      name: 'Udemy',
      url: 'https://www.udemy.com',
      logo: 'https://www.udemy.com/staticx/udemy/images/v7/logo-udemy-inverted.svg',
      description: 'Learn on your schedule',
      color: 'bg-card dark:bg-[#0A1220]'
    },
    {
      name: 'edX',
      url: 'https://www.edx.org',
      logo: '/src/assets/images/Edx-logo.png',
      description: 'Education for everyone',
      color: 'bg-card dark:bg-[#0A1220]'
    },
    {
      name: 'freeCodeCamp',
      url: 'https://www.freecodecamp.org',
      logo: 'https://cdn.freecodecamp.org/platform/universal/fcc_primary.svg',
      description: 'Learn to code for free',
      color: 'bg-card dark:bg-[#0A1220]'
    }
  ];

  return (
    <div className="space-y-12 p-6 max-w-7xl mx-auto">
      {/* Learning Platforms Section */}
      <section className="relative">
        {/* Background gradient effect */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-3/4 h-72 bg-blue-100/30 dark:bg-blue-600/5 blur-3xl rounded-full -z-10"></div>
        
        {/* Section header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-foreground dark:text-white">Learning Platforms</h2>
            <p className="text-muted-foreground dark:text-slate-400 mt-1">Continue your learning journey with these educational platforms</p>
          </div>
        </div>

        {/* Responsive grid of platform cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {platforms.map((platform) => (
            <div key={platform.name}>
              {/* Platform card with hover effects */}
              <Card className={`relative overflow-hidden h-56 border border-border dark:border-slate-700 ${platform.color} shadow-sm 
                            hover:border-blue-300 dark:hover:border-slate-500 transition-all duration-300 group`}>
                {/* Dark overlay for better text contrast */}
                <div className="absolute inset-0 bg-gray-200/70 dark:bg-[#0A1220]/40"></div>
                
                {/* Loading spinner overlay - shown while image is loading */}
                {!loadedImages[platform.name] && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted/80 dark:bg-[#0A1220]/40 z-10">
                    <svg className="animate-spin h-6 w-6 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                )}
                
                <CardContent className="h-full p-0">
                  {/* External link to the platform website */}
                  <a
                    href={platform.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block h-full w-full p-8"
                  >
                    {/* Card content layout structure */}
                    <div className="h-full flex flex-col relative z-10">
                      {/* Platform logo container */}
                      <div className="flex items-center justify-center flex-1">
                        {/* Platform logo image with fade-in effect on load */}
                        <img
                          src={platform.logo}
                          alt={platform.name}
                          onLoad={() => handleImageLoad(platform.name)}
                          className={`max-h-16 object-contain ${loadedImages[platform.name] ? 'opacity-100' : 'opacity-0'} 
                                     transition-opacity duration-300`}
                        />
                      </div>
                      
                      {/* Platform information footer */}
                      <div className="mt-auto">
                        <div className="flex items-center justify-between">
                          <div>
                            {/* Platform name */}
                            <div className="text-lg font-medium text-foreground dark:text-white">{platform.name}</div>
                            {/* Platform description */}
                            <div className="text-sm text-muted-foreground dark:text-slate-300">{platform.description}</div>
                          </div>
                          {/* External link icon with hover effect */}
                          <ExternalLink className="w-5 h-5 text-muted-foreground dark:text-slate-300 group-hover:text-blue-500 dark:group-hover:text-white transition-colors" />
                        </div>
                      </div>
                    </div>
                  </a>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </section>   
    </div>
  );
}