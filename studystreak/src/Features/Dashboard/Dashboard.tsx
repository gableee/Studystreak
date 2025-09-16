import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PlusIcon } from "lucide-react";

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
    <div className="max-w-7xl mx-auto px-2">
      <section className="relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-72 bg-blue-600/10 blur-[120px] rounded-full -z-10"></div>
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-100 to-indigo-200 bg-clip-text text-transparent">My Courses</h2>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-blue-700/20">
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Course
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <div key={course.id}>
            <Card 
              className="border-white/5 bg-gradient-to-b from-[#0C1423] to-[#0A1220] shadow-lg shadow-blue-900/5 
                        hover:border-blue-500/20 transition-all duration-300 hover:shadow-blue-900/10 hover:-translate-y-0.5"
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-blue-50 font-medium tracking-tight">{course.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative mb-1">
                  <Progress 
                    value={course.progress} 
                    className="h-2.5 mb-4 bg-slate-800 shadow-inner rounded-full overflow-hidden" 
                    style={{
                      backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
                      backgroundSize: '10px 10px'
                    }}
                  />
                  {course.progress >= 75 && (
                    <span className="absolute right-0 top-0 h-full w-1.5 bg-blue-300 rounded-r-full animate-pulse"></span>
                  )}
                </div>
                <div className="flex justify-between text-sm font-medium text-slate-400 mb-4">
                  <span className="flex items-center">
                    <div className={`mr-1.5 h-2 w-2 rounded-full ${
                      course.progress < 30 ? 'bg-amber-400' : 
                      course.progress < 70 ? 'bg-blue-400' : 'bg-emerald-400'
                    }`}></div>
                    <span className={`${
                      course.progress < 30 ? 'text-amber-300' : 
                      course.progress < 70 ? 'text-blue-300' : 'text-emerald-300'
                    }`}>{course.progress}% Complete</span>
                  </span>
                  <span className="text-indigo-300/90">{course.totalHours} hours</span>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between pt-0">
                <span className="text-sm text-slate-500">Last accessed {course.lastAccessed}</span>
                <Button variant="ghost" className="text-blue-400 hover:text-blue-200 hover:bg-blue-900/30">
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
            <Card className="border-white/5 bg-gradient-to-br from-[#0C1423] to-[#0A1220] hover:border-blue-500/10 transition-all duration-300 hover:-translate-y-1 group overflow-hidden">
              <CardContent className="pt-6 relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full -mr-16 -mt-16 group-hover:bg-blue-600/10 transition-all duration-500"></div>
                <h4 className="text-sm text-blue-200/70 font-medium mb-2 tracking-wide uppercase">Total Learning Time</h4>
                <p className="text-3xl font-bold text-white flex items-baseline">
                  47 <span className="text-lg ml-1.5 text-blue-200/80 font-medium">hours</span>
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div>
            <Card className="border-white/5 bg-gradient-to-br from-[#0C1423] to-[#0A1220] hover:border-indigo-500/10 transition-all duration-300 hover:-translate-y-1 group overflow-hidden">
              <CardContent className="pt-6 relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 rounded-full -mr-16 -mt-16 group-hover:bg-indigo-600/10 transition-all duration-500"></div>
                <h4 className="text-sm text-indigo-200/70 font-medium mb-2 tracking-wide uppercase">Courses in Progress</h4>
                <p className="text-3xl font-bold text-white flex items-baseline">
                  3 <span className="text-lg ml-1.5 text-indigo-200/80 font-medium">courses</span>
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div>
            <Card className="border-white/5 bg-gradient-to-br from-[#0C1423] to-[#0A1220] hover:border-emerald-500/10 transition-all duration-300 hover:-translate-y-1 group overflow-hidden">
              <CardContent className="pt-6 relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/5 rounded-full -mr-16 -mt-16 group-hover:bg-emerald-600/10 transition-all duration-500"></div>
                <h4 className="text-sm text-emerald-200/70 font-medium mb-2 tracking-wide uppercase">Completed Courses</h4>
                <p className="text-3xl font-bold text-white flex items-baseline">
                  5 <span className="text-lg ml-1.5 text-emerald-200/80 font-medium">courses</span>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}