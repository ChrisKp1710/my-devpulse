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
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="flex-1 relative px-6 py-4 flex">
        {/* Lista server (occupa tutto se la sidebar è chiusa) */}
        <div className={`flex-1 transition-all duration-300`}>
          <ServerActions />
          <ServerList />
        </div>

        {/* Sidebar (visibile solo se selezionato un server) */}
        {selectedServer && (
          <div className="w-[350px] ml-6 shrink-0">
            <ServerSidebar />
          </div>
        )}
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