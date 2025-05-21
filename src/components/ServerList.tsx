import React from 'react';
import ServerCard from './ServerCard';
import { useServer } from '../context/ServerContext';
import AddServerModal from './AddServerModal'; // <--- import aggiunto

const ServerList: React.FC = () => {
  const { servers } = useServer();
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
      <h2 className="text-2xl font-bold text-white">Servers</h2>
        <AddServerModal /> {/* bottone reale che apre la modale */}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {servers.map((server) => (
          <ServerCard key={server.id} server={server} />
        ))}
      </div>
    </div>
  );
};

export default ServerList;