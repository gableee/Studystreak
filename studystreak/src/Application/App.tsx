
import {Header, SideBar} from './AppInterface.tsx'
import './App.css'

function App() {

  return (
    <>
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
    </>
  )
}

export default App
