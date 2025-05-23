// src/pages/Settings.tsx

import React from "react"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

const Settings: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground px-6 py-8">
      <div className="max-w-3xl mx-auto space-y-10">
        <h1 className="text-3xl font-bold">Settings</h1>

        {/* General Settings */}
        <div>
          <h2 className="text-xl font-semibold mb-4">General</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="boot">Start app on system boot</Label>
              <Switch id="boot" />
            </div>

            <div>
              <Label htmlFor="language" className="block mb-1">
                Language
              </Label>
              <select id="language" className="w-full border border-border rounded-md bg-background px-3 py-2">
                <option>English</option>
                <option>Italiano</option>
              </select>
            </div>
          </div>
        </div>

        <Separator />

        {/* SSH Defaults */}
        <div>
          <h2 className="text-xl font-semibold mb-4">SSH Defaults</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="sshUser" className="block mb-1">
                Default SSH User
              </Label>
              <Input id="sshUser" placeholder="es. root" />
            </div>

            <div>
              <Label htmlFor="sshPort" className="block mb-1">
                Default SSH Port
              </Label>
              <Input id="sshPort" type="number" placeholder="22" />
            </div>
          </div>
        </div>

        <Separator />

        {/* Terminal */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Terminal</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="fontSize" className="block mb-1">
                Font Size
              </Label>
              <Input id="fontSize" type="number" placeholder="14" />
            </div>
            <div>
              <Label htmlFor="startCommand" className="block mb-1">
                Initial Command
              </Label>
              <Input id="startCommand" placeholder="htop, clear, etc..." />
            </div>
          </div>
        </div>

        <Separator />

        {/* Reset Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Reset</h2>
          <p className="text-sm text-muted-foreground mb-4">
            This will delete all saved servers and reset preferences.
          </p>
          <Button variant="destructive">Reset App</Button>
        </div>
      </div>
    </div>
  )
}

export default Settings