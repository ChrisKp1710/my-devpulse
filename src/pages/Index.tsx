import Navbar from '../components/Navbar';
import ServerList from '../components/ServerList';
import ServerSidebar from '../components/ServerSidebar';
import Terminal from '../components/Terminal';
import { ServerProvider } from '../context/ServerContext';

const Index = () => {
  return (
    <ServerProvider>
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-auto">
            <ServerList />
          </div>
          
          <ServerSidebar />
        </div>
        
        <Terminal server={{
          ip: '',
          sshPort: 0,
          sshUser: '',
          sshKey: ''
        }} />
      </div>
    </ServerProvider>
  );
};

export default Index;
