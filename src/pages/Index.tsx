import Navbar from '../components/Navbar';
import ServerList from '../components/ServerList';
import ServerSidebar from '../components/ServerSidebar';
import Terminal from '../components/Terminal';
import { useServer } from '../context/useServer';
import { ServerProvider } from '../context/ServerContext';

const Layout = () => {
  const { terminalVisible } = useServer();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto">
          <ServerList />
        </div>
        <ServerSidebar />
      </div>

      {/* Il terminale appare solo quando terminalVisible è true */}
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