import React from "react"
import { ThemeToggle } from "@/components/ThemeToggle"

const Navbar: React.FC = () => {
  return (
    <nav className="bg-background border-b border-border px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Logo / Titolo */}
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-foreground">ServerAccess</h1>
        </div>

        {/* Menu + Toggle */}
        <div className="flex items-center gap-4">
          <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Dashboard
          </button>
          <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Servers
          </button>
          <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Settings
          </button>

          {/* Toggle Tema */}
          <ThemeToggle />
        </div>
      </div>
    </nav>
  )
}

export default Navbar