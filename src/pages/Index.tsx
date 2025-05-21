import Navbar from '../components/Navbar';
import ServerList from '../components/ServerList';
import ServerSidebar from '../components/ServerSidebar';
import Terminal from '../components/Terminal';
import { ServerProvider, useServer } from '../context/ServerContext';

const Layout = () => {
  const { selectedServer } = useServer();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto">
          <ServerList />
        </div>
        <ServerSidebar />
      </div>

      {selectedServer && selectedServer.ip && (
        <Terminal
          server={{
            ...selectedServer,
            sshPort: selectedServer.sshPort || 22,
            sshUser: selectedServer.sshUser || "default",
            sshKey: selectedServer.sshKey || "",
          }}
        />
      )}
    </div>
  );
};

const Index = () => (
  <ServerProvider>
    <Layout />
  </ServerProvider>
);

export default Index;