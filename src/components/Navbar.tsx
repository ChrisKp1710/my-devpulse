import React from "react"
import { ThemeToggle } from "@/components/ThemeToggle"
import { Link, useLocation } from "react-router-dom"

const Navbar: React.FC = () => {
  const location = useLocation()

  const navItems = [
    { name: "Servers", path: "/" },
    { name: "Settings", path: "/settings" },
  ]

  return (
    <nav className="bg-background border-b border-border px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Logo / Titolo */}
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">DevPulse</h1>
        </div>

        {/* Menu + Toggle */}
        <div className="flex items-center gap-2">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`text-sm font-normal px-3 py-1.5 rounded-md transition-colors
                ${
                  location.pathname === item.path
                    ? "text-foreground bg-accent"
                    : "text-muted-foreground hover:bg-[#5b5fc4]/15 hover:text-[#3e3f90] dark:hover:bg-[#5b5fc4]/20 dark:hover:text-[#cdd1ff]"
                }
              `}
            >
              {item.name}
            </Link>
          ))}

          <ThemeToggle />
        </div>
      </div>
    </nav>
  )
}

export default Navbar