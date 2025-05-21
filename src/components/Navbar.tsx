import React from 'react';


const Navbar: React.FC = () => {
  return (
    <nav className="bg-background border-b border-border px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">ServerAccess</h1>
        </div>
        
        <div className="flex gap-4">
          <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Dashboard
          </button>
          <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Servers
          </button>
          <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Settings
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;