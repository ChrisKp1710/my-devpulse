import Navbar from '../components/Navbar';
import ServerList from '../components/ServerList';
import ServerSidebar from '../components/ServerSidebar';
import Terminal from '../components/Terminal';
import { useServer } from '../context/useServer';
import { ServerProvider } from '../context/ServerContext';
import ServerActions from '../components/ServerActions';

const Layout = () => {
  const { terminalVisible, selectedServer } = useServer();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="flex-1 relative px-6 py-4 flex">
        {/* Sezione principale */}
        <div className="flex-1 transition-all duration-300">
          {/* Titolo + Bottoni */}
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-2xl font-bold text-foreground">Servers</h2>
            <ServerActions />
          </div>

          {/* Lista Server */}
          <ServerList />
        </div>

        {/* Sidebar se un server è selezionato */}
        {selectedServer && (
          <div className="w-[350px] ml-6 shrink-0">
            <ServerSidebar />
          </div>
        )}
      </div>

      {/* Terminale */}
      {terminalVisible && <Terminal />}
    </div>
  );
};

const Index = () => (
  <ServerProvider>
    <Layout />
  </ServerProvider>
);

export default Index;