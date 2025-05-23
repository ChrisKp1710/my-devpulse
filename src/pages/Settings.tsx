import React from "react"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const Settings: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground px-6 py-10">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold mb-4">Settings</h1>

        {/* General */}
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="boot">Start app on system boot</Label>
              <Switch id="boot" />
            </div>

            <div>
              <Label htmlFor="language" className="block mb-1">
                Language
              </Label>
              <select
                id="language"
                className="w-full border border-border rounded-md bg-background px-3 py-2"
              >
                <option>English</option>
                <option>Italiano</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* SSH Defaults */}
        <Card>
          <CardHeader>
            <CardTitle>SSH Defaults</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>

        {/* Terminal */}
        <Card>
          <CardHeader>
            <CardTitle>Terminal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>

        {/* Reset */}
        <Card>
          <CardHeader>
            <CardTitle>Reset</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              This will delete all saved servers and reset preferences.
            </p>
            <Button variant="destructive">Reset App</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Settings