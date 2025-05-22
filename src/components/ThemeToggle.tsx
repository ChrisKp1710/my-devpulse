import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Sun, Moon, Laptop2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"

const themeOptions = [
  { label: "Light", value: "light", icon: Sun },
  { label: "Dark", value: "dark", icon: Moon },
  { label: "System", value: "system", icon: Laptop2 },
]

export const ThemeToggle = () => {
  const { setTheme, theme: storedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  const active = themeOptions.find(opt => opt.value === storedTheme) || themeOptions[0]
  const Icon = active.icon

  const dropdownOptions = themeOptions.filter(opt => opt.value !== storedTheme)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 text-sm">
          <Icon size={16} />
          <span className="capitalize hidden sm:inline">{active.label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-40">
        <div className="flex flex-col gap-1">
          {dropdownOptions.map(({ label, value, icon: OptionIcon }) => (
            <Button
              key={value}
              variant="ghost"
              className="justify-start w-full flex items-center"
              onClick={() => setTheme(value)}
            >
              <OptionIcon size={16} className="mr-2" />
              {label}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}