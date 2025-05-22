import React from "react"
import { ThemeToggle } from "@/components/ThemeToggle"
import { Button } from "@/components/ui/button"

const Navbar: React.FC = () => {
  return (
    <nav className="bg-background border-b border-border px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Logo / Titolo */}
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">DevPulse</h1>
        </div>

        {/* Menu + Toggle */}
        <div className="flex items-center gap-2">
          {["Dashboard", "Servers", "Settings"].map((item) => (
            <Button
              key={item}
              variant="ghost"
              className="text-sm font-normal text-muted-foreground px-3 py-1.5 rounded-md transition-colors hover:bg-[#5b5fc4]/15 hover:text-[#3e3f90] dark:hover:bg-[#5b5fc4]/20 dark:hover:text-[#cdd1ff]"
            >
              {item}
            </Button>
          ))}

          {/* Toggle Tema */}
          <ThemeToggle />
        </div>
      </div>
    </nav>
  )
}

export default Navbar