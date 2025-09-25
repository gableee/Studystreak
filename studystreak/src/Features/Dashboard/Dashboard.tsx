/**
 * Dashboard Component
 * 
 * The Dashboard is the main landing page of the StudyStreak application.
 * It displays:
 * - A summary of current courses and their progress
 * - Quick statistics about the user's learning
 * - Recent activity and upcoming deadlines
 * - Interface to quickly add or access existing courses
 * 
 * The dashboard provides an at-a-glance view of the user's study progress
 * and serves as the central hub for navigation to other features.
 * 
 * @module Features/Dashboard
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PlusIcon } from "lucide-react";

export default function Dashboard() {
  /**
   * Sample course data
   * In a real application, this would be fetched from an API or database
   * Each course includes:
   * - id: Unique identifier
   * - title: Course name
   * - progress: Completion percentage (0-100)
   * - lastAccessed: Human-readable time since last access
   * - totalHours: Total course duration in hours
   */
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
    <div className="max-w-7xl mx-auto px-2">
      {/* My Courses Section */}
      <section className="relative">
        {/* Background gradient effect */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-3/4 h-72 bg-blue-100/30 dark:bg-blue-600/5 rounded-full blur-3xl -z-10"></div>

        {/* Section header with add course button */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-foreground dark:bg-gradient-to-r 
          dark:from-blue-100 dark:to-indigo-200 dark:bg-clip-text dark:text-transparent">My Courses</h2>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-blue-700/20">
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Course
          </Button>
        </div>

        {/* Responsive course cards grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Map through course data to render course cards */}
          {courses.map((course) => (
            <div key={course.id}>
            {/* Course card with hover effects */}
            <Card 
              className="border-border bg-card dark:bg-gradient-to-b dark:from-[#0C1423] dark:to-[#0A1220] shadow-lg shadow-gray-200/50 dark:shadow-blue-900/5 
                        hover:border-blue-200 dark:hover:border-blue-500/20 transition-all duration-300 hover:shadow-blue-200/30 dark:hover:shadow-blue-900/10 hover:-translate-y-0.5"
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-card-foreground dark:text-blue-50 font-medium tracking-tight">{course.title}</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Progress bar with visual enhancements */}
                <div className="relative mb-1">
                  <Progress 
                    value={course.progress} 
                    className="h-2.5 mb-4 bg-muted dark:bg-slate-800 shadow-inner rounded-full overflow-hidden" 
                    style={{
                      backgroundImage: 'linear-gradient(90deg, rgba(100,100,100,0.03) 1px, transparent 1px)',
                      backgroundSize: '10px 10px'
                    }}
                  />
                  {/* Pulsing indicator for nearly complete courses */}
                  {course.progress >= 75 && (
                    <span className="absolute right-0 top-0 h-full w-1.5 bg-blue-400 dark:bg-blue-300 rounded-r-full animate-pulse"></span>
                  )}
                </div>
                {/* Course completion status with color indicators */}
                <div className="flex justify-between text-sm font-medium text-muted-foreground dark:text-slate-400 mb-4">
                  <span className="flex items-center">
                    {/* Color-coded status dot based on progress percentage */}
                    <div className={`mr-1.5 h-2 w-2 rounded-full ${
                      course.progress < 30 ? 'bg-amber-400' : 
                      course.progress < 70 ? 'bg-blue-400' : 'bg-emerald-400'
                    }`}></div>
                    {/* Color-coded completion text based on progress percentage */}
                    <span className={`${
                      course.progress < 30 ? 'text-amber-500 dark:text-amber-300' : 
                      course.progress < 70 ? 'text-blue-500 dark:text-blue-300' : 'text-emerald-500 dark:text-emerald-300'
                    }`}>{course.progress}% Complete</span>
                  </span>
                  {/* Total course hours */}
                  <span className="text-indigo-500/90 dark:text-indigo-300/90">{course.totalHours} hours</span>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between pt-0">
                <span className="text-sm text-muted-foreground dark:text-slate-500">Last accessed {course.lastAccessed}</span>
                <Button variant="ghost" className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/30">
                  Continue
                </Button>
              </CardFooter>
            </Card>
            </div>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <Card className="border-border bg-card dark:bg-gradient-to-br dark:from-[#0C1423] dark:to-[#0A1220] hover:border-blue-200 dark:hover:border-blue-500/10 transition-all duration-300 hover:-translate-y-1 group overflow-hidden relative">
              {/* Blurred background effect */}
              <div className="absolute top-0 left-0 w-full h-20 bg-blue-500/10 dark:bg-blue-400/5 blur-xl rounded-t-lg"></div>
              <CardContent className="pt-6 relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/50 dark:bg-blue-600/5 rounded-full -mr-16 -mt-16 group-hover:bg-blue-200/50 dark:group-hover:bg-blue-600/10 transition-all duration-500"></div>
                <h4 className="text-sm text-blue-600/70 dark:text-blue-200/70 font-medium mb-2 tracking-wide uppercase">Total Learning Time</h4>
                <p className="text-3xl font-bold text-card-foreground dark:text-white flex items-baseline">
                  47 <span className="text-lg ml-1.5 text-blue-500/80 dark:text-blue-200/80 font-medium">hours</span>
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div>
            <Card className="border-border bg-card dark:bg-gradient-to-br dark:from-[#0C1423] dark:to-[#0A1220] hover:border-indigo-200 dark:hover:border-indigo-500/10 transition-all duration-300 hover:-translate-y-1 group overflow-hidden relative">
              {/* Blurred background effect */}
              <div className="absolute top-0 left-0 w-full h-20 bg-indigo-500/10 dark:bg-indigo-400/5 blur-xl rounded-t-lg"></div>
              <CardContent className="pt-6 relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100/50 dark:bg-indigo-600/5 rounded-full -mr-16 -mt-16 group-hover:bg-indigo-200/50 dark:group-hover:bg-indigo-600/10 transition-all duration-500"></div>
                <h4 className="text-sm text-indigo-600/70 dark:text-indigo-200/70 font-medium mb-2 tracking-wide uppercase">Courses in Progress</h4>
                <p className="text-3xl font-bold text-card-foreground dark:text-white flex items-baseline">
                  3 <span className="text-lg ml-1.5 text-indigo-500/80 dark:text-indigo-200/80 font-medium">courses</span>
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div>
            <Card className="border-border bg-card dark:bg-gradient-to-br dark:from-[#0C1423] dark:to-[#0A1220] hover:border-emerald-200 dark:hover:border-emerald-500/10 transition-all duration-300 hover:-translate-y-1 group overflow-hidden relative">
              {/* Blurred background effect */}
              <div className="absolute top-0 left-0 w-full h-20 bg-emerald-500/10 dark:bg-emerald-400/5 blur-xl rounded-t-lg"></div>
              <CardContent className="pt-6 relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/50 dark:bg-emerald-600/5 rounded-full -mr-16 -mt-16 group-hover:bg-emerald-200/50 dark:group-hover:bg-emerald-600/10 transition-all duration-500"></div>
                <h4 className="text-sm text-emerald-600/70 dark:text-emerald-200/70 font-medium mb-2 tracking-wide uppercase">Completed Courses</h4>
                <p className="text-3xl font-bold text-card-foreground dark:text-white flex items-baseline">
                  5 <span className="text-lg ml-1.5 text-emerald-500/80 dark:text-emerald-200/80 font-medium">courses</span>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}