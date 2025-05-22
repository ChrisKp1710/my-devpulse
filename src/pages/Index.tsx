// index.tsx
import Navbar from '../components/Navbar'
import ServerList from '../components/ServerList'
import ServerSidebar from '../components/ServerSidebar'
import Terminal from '../components/Terminal'
import { useServer } from '../context/useServer'
import { ServerProvider } from '../context/ServerContext'
import ServerActions from '../components/ServerActions'

const Layout = () => {
  const { terminalVisible, selectedServer } = useServer()

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <Navbar />

      <div className="flex-1 relative px-6 py-4">
        {/* Bottoni azione server in alto a destra */}
        <ServerActions />

        {/* Lista server con padding solo se sidebar attiva */}
        <div
          className={`transition-all duration-300 ${
            selectedServer ? 'pr-[350px]' : 'pr-0'
          }`}
        >
          <ServerList />
        </div>

        {/* Sidebar flottante */}
        {selectedServer && <ServerSidebar />}
      </div>

      {terminalVisible && <Terminal />}
    </div>
  )
}

const Index = () => (
  <ServerProvider>
    <Layout />
  </ServerProvider>
)

export default Index
