import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { useServer } from "@/context/useServer";
import { loadServers } from "@/lib/serverStorage";
import { invoke } from "@tauri-apps/api/core";
import {
  DownloadCloud,
  Upload,
  Save,
  RotateCw,
  Palette,
  Terminal,
  Laptop,
  Zap,
  AlertTriangle,
  Settings as SettingsIcon,
} from 'lucide-react';

// Pre-defined themes
const PRESET_THEMES = [
  {
    name: "Default",
    colors: {
      primary: "#3b82f6",
      background: "#1e293b",
      accent: "#f97316",
      text: "#f8fafc"
    }
  },
  {
    name: "Ocean",
    colors: {
      primary: "#0ea5e9",
      background: "#0f172a",
      accent: "#06b6d4",
      text: "#f1f5f9"
    }
  },
  {
    name: "Forest",
    colors: {
      primary: "#22c55e",
      background: "#14532d",
      accent: "#84cc16",
      text: "#ecfdf5"
    }
  },
  {
    name: "Sunset",
    colors: {
      primary: "#f97316",
      background: "#7f1d1d",
      accent: "#f59e0b",
      text: "#fff7ed"
    }
  },
  {
    name: "Cyberpunk",
    colors: {
      primary: "#d946ef",
      background: "#18181b",
      accent: "#f472b6",
      text: "#fdf4ff"
    }
  }
];

const Settings: React.FC = () => {
  const { setServers } = useServer();
  
  // Theme settings
  const [, setThemeMode] = useState("dark");
  const [selectedPreset, setSelectedPreset] = useState("Default");
  const [customTheme, setCustomTheme] = useState({
    primary: "#3b82f6",
    background: "#1e293b",
    accent: "#f97316",
    text: "#f8fafc"
  });
  
  // General settings
  const [language, setLanguage] = useState("english");
  const [startMinimized, setStartMinimized] = useState(false);
  const [defaultSSHPort, setDefaultSSHPort] = useState("22");
  const [defaultSSHUser, setDefaultSSHUser] = useState("root");
  
  // Terminal settings
  const [terminalFontSize, setTerminalFontSize] = useState(14);
  const [terminalFontFamily, setTerminalFontFamily] = useState("JetBrains Mono");
  const [terminalOpacity, setTerminalOpacity] = useState(95);
  const [initialCommand, setInitialCommand] = useState("");
  
  // Advanced settings
  const [pingInterval, setPingInterval] = useState("60");
  const [connectionTimeout, setConnectionTimeout] = useState("10");
  const [debugMode, setDebugMode] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1);

  // Handle theme changes
  const applyPresetTheme = (presetName: string) => {
    const preset = PRESET_THEMES.find(t => t.name === presetName);
    if (preset) {
      setSelectedPreset(presetName);
      setCustomTheme(preset.colors);
    }
  };

  // ✅ TAURI: Export servers using Tauri commands
  const handleExportServers = async () => {
    try {
      const jsonData = await invoke<string>("export_servers_json");
      
      const dataBlob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `devpulse-servers-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("✅ Server configurations exported successfully");
    } catch (error) {
      console.error("❌ Export error:", error);
      toast.error(`❌ Export failed: ${error}`);
    }
  };

  // ✅ TAURI: Import servers using file input
  const handleImportServers = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const importedCount = await invoke<number>("import_servers_json", { jsonData: text });
        
        // Reload servers in the context
        const updatedServers = await loadServers();
        setServers(updatedServers);
        
        toast.success(`✅ Successfully imported ${importedCount} servers`);
      } catch (error) {
        console.error("❌ Import error:", error);
        toast.error(`❌ Import failed: ${error}`);
      }
    };
    input.click();
  };

  // Export custom theme
  const exportTheme = () => {
    const themeData = JSON.stringify(customTheme, null, 2);
    const blob = new Blob([themeData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'devpulse-theme.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("🎨 Custom theme exported successfully");
  };

  // Simple ColorPicker component
  const ColorPicker = ({ color, onChange }: { color: string; onChange: (color: string) => void }) => (
    <input
      type="color"
      value={color}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-8 rounded border border-border cursor-pointer"
    />
  );

  // Simple ThemePreview component
  const ThemePreview = ({ theme }: { theme: typeof customTheme }) => (
    <div 
      className="rounded-lg p-4 border"
      style={{ 
        backgroundColor: theme.background,
        color: theme.text,
        borderColor: theme.primary
      }}
    >
      <div className="space-y-2">
        <div 
          className="h-2 rounded" 
          style={{ backgroundColor: theme.primary }}
        />
        <div 
          className="h-4 w-3/4 rounded" 
          style={{ backgroundColor: theme.accent }}
        />
        <div 
          className="h-2 w-1/2 rounded opacity-70" 
          style={{ backgroundColor: theme.text }}
        />
      </div>
    </div>
  );

  // Simple TerminalPreview component
  const TerminalPreview = ({ 
    fontFamily, 
    fontSize, 
    opacity, 
    theme 
  }: { 
    fontFamily: string; 
    fontSize: number; 
    opacity: number; 
    theme: typeof customTheme 
  }) => (
    <div 
      className="rounded-lg p-4 font-mono border"
      style={{ 
        backgroundColor: theme.background,
        color: theme.text,
        fontFamily: fontFamily,
        fontSize: `${fontSize}px`,
        opacity: opacity / 100
      }}
    >
      <div>$ whoami</div>
      <div style={{ color: theme.primary }}>christian</div>
      <div>$ ls -la</div>
      <div style={{ color: theme.accent }}>-rw-r--r-- 1 user user 1234 Jan 23 10:30 file.txt</div>
      <div>$ _</div>
    </div>
  );

  // Reset functions
  const resetAppSettings = () => {
    if (confirm("Are you sure you want to reset all app settings? This won't affect your servers.")) {
      setThemeMode("dark");
      setSelectedPreset("Default");
      setCustomTheme(PRESET_THEMES[0].colors);
      setLanguage("english");
      setStartMinimized(false);
      setDefaultSSHPort("22");
      setDefaultSSHUser("root");
      setTerminalFontSize(14);
      setTerminalFontFamily("JetBrains Mono");
      setTerminalOpacity(95);
      setInitialCommand("");
      setPingInterval("60");
      setConnectionTimeout("10");
      setDebugMode(false);
      setAnimationSpeed(1);
      
      toast.success("⚙️ Settings reset to default values");
    }
  };

  const clearAllServers = async () => {
    if (confirm("Are you sure you want to remove all servers? This action cannot be undone.")) {
      try {
        // Get all servers and delete them one by one
        const servers = await loadServers();
        for (const server of servers) {
          await invoke("delete_server", { id: server.id });
        }
        
        // Update context
        setServers([]);
        toast.success("🗑️ All servers have been removed", { 
          description: "Your server list has been cleared completely" 
        });
      } catch (error) {
        console.error("❌ Error clearing servers:", error);
        toast.error("❌ Failed to clear all servers");
      }
    }
  };

  const factoryReset = () => {
    if (confirm("Are you sure you want to perform a factory reset? This will remove all servers and settings.")) {
      resetAppSettings();
      clearAllServers();
      
      toast.success("🏭 Factory reset completed", {
        description: "All data has been reset to factory defaults"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="p-6 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2 mb-6">
          <SettingsIcon className="h-6 w-6" />
          <h2 className="text-2xl font-bold">DevPulse Settings</h2>
        </div>
        
        <Tabs defaultValue="general" className="w-full">
          <div className="flex gap-6">
            <Card className="w-64 h-fit sticky top-6">
              <CardContent className="p-0">
                <TabsList className="flex flex-col items-stretch h-auto bg-transparent gap-1 p-2">
                  <TabsTrigger value="general" className="flex items-center justify-start gap-2 px-3 py-2 h-10">
                    <Laptop className="h-4 w-4" />
                    <span>General</span>
                  </TabsTrigger>
                  <TabsTrigger value="appearance" className="flex items-center justify-start gap-2 px-3 py-2 h-10">
                    <Palette className="h-4 w-4" />
                    <span>Appearance</span>
                  </TabsTrigger>
                  <TabsTrigger value="terminal" className="flex items-center justify-start gap-2 px-3 py-2 h-10">
                    <Terminal className="h-4 w-4" />
                    <span>Terminal</span>
                  </TabsTrigger>
                  <TabsTrigger value="backup" className="flex items-center justify-start gap-2 px-3 py-2 h-10">
                    <DownloadCloud className="h-4 w-4" />
                    <span>Backup & Import</span>
                  </TabsTrigger>
                  <TabsTrigger value="advanced" className="flex items-center justify-start gap-2 px-3 py-2 h-10">
                    <Zap className="h-4 w-4" />
                    <span>Advanced</span>
                  </TabsTrigger>
                  <Separator className="my-2" />
                  <TabsTrigger value="danger" className="flex items-center justify-start gap-2 px-3 py-2 h-10 text-red-500">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Danger Zone</span>
                  </TabsTrigger>
                </TabsList>
              </CardContent>
            </Card>
            
            <div className="flex-1">
              {/* General Settings */}
              <TabsContent value="general" className="m-0">
                <Card>
                  <CardHeader>
                    <CardTitle>General Settings</CardTitle>
                    <CardDescription>Configure basic application preferences</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Application</h3>
                      <Separator />
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="start-minimized">Start Minimized</Label>
                          <p className="text-sm text-muted-foreground">
                            Launch application in background
                          </p>
                        </div>
                        <Switch
                          id="start-minimized"
                          checked={startMinimized}
                          onCheckedChange={setStartMinimized}
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="language">Language</Label>
                        <Select value={language} onValueChange={setLanguage}>
                          <SelectTrigger id="language">
                            <SelectValue placeholder="Select language" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="english">English</SelectItem>
                            <SelectItem value="italiano">Italiano</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Default SSH Settings</h3>
                      <Separator />
                      
                      <div className="grid gap-2">
                        <Label htmlFor="default-ssh-user">Default SSH User</Label>
                        <Input
                          id="default-ssh-user"
                          value={defaultSSHUser}
                          onChange={(e) => setDefaultSSHUser(e.target.value)}
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="default-ssh-port">Default SSH Port</Label>
                        <Input
                          id="default-ssh-port"
                          type="number"
                          value={defaultSSHPort}
                          onChange={(e) => setDefaultSSHPort(e.target.value)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Appearance Settings - continua in prossimo messaggio per limiti di lunghezza */}
              <TabsContent value="appearance" className="m-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Appearance</CardTitle>
                    <CardDescription>Customize the look and feel of the application</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">

                      <h3 className="text-lg font-medium">Theme Presets</h3>
                      <Separator />
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {PRESET_THEMES.map(preset => (
                          <div 
                            key={preset.name}
                            onClick={() => applyPresetTheme(preset.name)} 
                            className={`cursor-pointer rounded-lg border transition-all hover:scale-105 ${selectedPreset === preset.name ? "border-primary ring-2 ring-primary" : "border-border"}`}
                          >
                            <div 
                              className="aspect-video rounded-t-md" 
                              style={{ 
                                background: preset.colors.background,
                                position: 'relative',
                                overflow: 'hidden'
                              }}
                            >
                              <div className="absolute top-2 left-2 right-2 h-2 rounded-full" style={{ background: preset.colors.primary }}></div>
                              <div className="absolute top-6 left-2 h-8 w-8 rounded-md" style={{ background: preset.colors.accent }}></div>
                              <div className="absolute bottom-2 left-2 right-2 h-2 rounded-full" style={{ background: preset.colors.text, opacity: 0.7 }}></div>
                            </div>
                            <p className="text-center py-2 font-medium">{preset.name}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Custom Theme</h3>
                      <Separator />
                      
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="primary-color">Primary Color</Label>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="w-6 h-6 rounded-md" style={{ background: customTheme.primary }}></div>
                              <ColorPicker 
                                color={customTheme.primary} 
                                onChange={(color) => setCustomTheme({...customTheme, primary: color})} 
                              />
                            </div>
                          </div>
                          
                          <div>
                            <Label htmlFor="background-color">Background Color</Label>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="w-6 h-6 rounded-md" style={{ background: customTheme.background }}></div>
                              <ColorPicker 
                                color={customTheme.background} 
                                onChange={(color) => setCustomTheme({...customTheme, background: color})} 
                              />
                            </div>
                          </div>
                          
                          <div>
                            <Label htmlFor="accent-color">Accent Color</Label>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="w-6 h-6 rounded-md" style={{ background: customTheme.accent }}></div>
                              <ColorPicker 
                                color={customTheme.accent} 
                                onChange={(color) => setCustomTheme({...customTheme, accent: color})} 
                              />
                            </div>
                          </div>
                          
                          <div>
                            <Label htmlFor="text-color">Text Color</Label>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="w-6 h-6 rounded-md" style={{ background: customTheme.text }}></div>
                              <ColorPicker 
                                color={customTheme.text} 
                                onChange={(color) => setCustomTheme({...customTheme, text: color})} 
                              />
                            </div>
                          </div>
                          
                          <div className="flex gap-2 pt-2">
                            <Button variant="outline" onClick={() => applyPresetTheme("Default")}>
                              <RotateCw className="h-4 w-4 mr-2" />
                              Reset
                            </Button>
                            <Button variant="outline" onClick={exportTheme}>
                              <DownloadCloud className="h-4 w-4 mr-2" />
                              Export Theme
                            </Button>
                          </div>
                        </div>
                        
                        <div>
                          <Label className="mb-2 block">Live Preview</Label>
                          <ThemePreview theme={customTheme} />
                          
                          <Button className="mt-4 w-full" onClick={() => {
                            toast.success("🎨 Theme applied successfully");
                          }}>
                            <Save className="h-4 w-4 mr-2" />
                            Apply Theme
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Terminal Settings */}
              <TabsContent value="terminal" className="m-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Terminal</CardTitle>
                    <CardDescription>Configure terminal appearance and behavior</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Terminal Appearance</h3>
                      <Separator />
                      
                      <div>
                        <Label htmlFor="font-family">Font Family</Label>
                        <Select value={terminalFontFamily} onValueChange={setTerminalFontFamily}>
                          <SelectTrigger id="font-family">
                            <SelectValue placeholder="Select font" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="JetBrains Mono">JetBrains Mono</SelectItem>
                            <SelectItem value="Monaco">Monaco</SelectItem>
                            <SelectItem value="Consolas">Consolas</SelectItem>
                            <SelectItem value="Fira Code">Fira Code</SelectItem>
                            <SelectItem value="Source Code Pro">Source Code Pro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label htmlFor="font-size">Font Size: {terminalFontSize}px</Label>
                          <span className="text-sm text-muted-foreground">{terminalFontSize}px</span>
                        </div>
                        <Slider
                          id="font-size"
                          min={10}
                          max={24}
                          step={1}
                          value={[terminalFontSize]}
                          onValueChange={(value) => setTerminalFontSize(value[0])}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label htmlFor="opacity">Terminal Opacity: {terminalOpacity}%</Label>
                          <span className="text-sm text-muted-foreground">{terminalOpacity}%</span>
                        </div>
                        <Slider
                          id="opacity"
                          min={50}
                          max={100}
                          step={1}
                          value={[terminalOpacity]}
                          onValueChange={(value) => setTerminalOpacity(value[0])}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Terminal Behavior</h3>
                      <Separator />
                      
                      <div>
                        <Label htmlFor="initial-command">Initial Command</Label>
                        <Input
                          id="initial-command"
                          value={initialCommand}
                          onChange={(e) => setInitialCommand(e.target.value)}
                          placeholder="e.g., ls -la or neofetch"
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          Command to run when a new terminal session begins
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <Label className="mb-2 block">Terminal Preview</Label>
                      <TerminalPreview 
                        fontFamily={terminalFontFamily}
                        fontSize={terminalFontSize}
                        opacity={terminalOpacity}
                        theme={customTheme}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Backup & Import Settings */}
              <TabsContent value="backup" className="m-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Configuration Backup</CardTitle>
                    <CardDescription>Backup and restore your server configurations</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Server Configurations</h3>
                      <Separator />
                      
                      <div className="grid gap-4">
                        <Button 
                          className="flex items-center justify-start" 
                          onClick={handleExportServers}
                        >
                          <DownloadCloud className="h-4 w-4 mr-2" />
                          Export Servers
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          className="flex items-center justify-start" 
                          onClick={handleImportServers}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Import Servers
                        </Button>
                        
                        <p className="text-sm text-muted-foreground">
                          Server configurations are exported as a JSON file that you can save as a backup.
                          You can later import this file to restore all your servers.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Advanced Settings */}
              <TabsContent value="advanced" className="m-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Advanced</CardTitle>
                    <CardDescription>Configure advanced application settings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Connection Settings</h3>
                      <Separator />
                      
                      <div>
                        <Label htmlFor="ping-interval">Auto-ping Interval</Label>
                        <Select value={pingInterval} onValueChange={setPingInterval}>
                          <SelectTrigger id="ping-interval">
                            <SelectValue placeholder="Select interval" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="30">30 seconds</SelectItem>
                            <SelectItem value="60">1 minute</SelectItem>
                            <SelectItem value="300">5 minutes</SelectItem>
                            <SelectItem value="600">10 minutes</SelectItem>
                            <SelectItem value="0">Disabled</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground mt-1">
                          How often to check if servers are online
                        </p>
                      </div>
                      
                      <div>
                        <Label htmlFor="conn-timeout">Connection Timeout</Label>
                        <Select value={connectionTimeout} onValueChange={setConnectionTimeout}>
                          <SelectTrigger id="conn-timeout">
                            <SelectValue placeholder="Select timeout" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5 seconds</SelectItem>
                            <SelectItem value="10">10 seconds</SelectItem>
                            <SelectItem value="30">30 seconds</SelectItem>
                            <SelectItem value="60">60 seconds</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Performance Settings</h3>
                      <Separator />
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="debug-mode">Debug Mode</Label>
                          <p className="text-sm text-muted-foreground">
                            Show additional debug information in console
                          </p>
                        </div>
                        <Switch
                          id="debug-mode"
                          checked={debugMode}
                          onCheckedChange={setDebugMode}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label htmlFor="animation-speed">Animation Speed: {animationSpeed}x</Label>
                          <span className="text-sm text-muted-foreground">{animationSpeed}x</span>
                        </div>
                        <Slider
                          id="animation-speed"
                          min={0}
                          max={2}
                          step={0.1}
                          value={[animationSpeed]}
                          onValueChange={(value) => setAnimationSpeed(value[0])}
                        />
                        <p className="text-sm text-muted-foreground">
                          Adjust the speed of UI animations (0 to disable, 1 is normal speed)
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Danger Zone Settings */}
              <TabsContent value="danger" className="m-0">
                <Card className="border-red-200 dark:border-red-900">
                  <CardHeader className="text-red-500 dark:text-red-400">
                    <CardTitle>Danger Zone</CardTitle>
                    <CardDescription>Destructive actions that cannot be undone</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <Separator className="bg-red-200 dark:bg-red-900" />
                      
                      <div className="rounded-md border border-red-200 dark:border-red-900 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">Reset App Settings</h3>
                            <p className="text-sm text-muted-foreground">
                              Reset all settings to default values. Server configurations will be preserved.
                            </p>
                          </div>
                          <Button 
                            variant="outline" 
                            onClick={resetAppSettings}
                          >
                            Reset Settings
                          </Button>
                        </div>
                      </div>
                      
                      <div className="rounded-md border border-red-200 dark:border-red-900 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">Clear All Servers</h3>
                            <p className="text-sm text-muted-foreground">
                              Remove all server configurations from the application. This cannot be undone.
                            </p>
                          </div>
                          <Button 
                            variant="outline" 
                            onClick={clearAllServers}
                          >
                            Clear Servers
                          </Button>
                        </div>
                      </div>
                      
                      <div className="rounded-md border border-red-200 dark:border-red-900 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">Factory Reset</h3>
                            <p className="text-sm text-muted-foreground">
                              Reset everything to factory defaults. All servers and settings will be removed.
                            </p>
                          </div>
                          <Button 
                            variant="destructive" 
                            onClick={factoryReset}
                          >
                            Factory Reset
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;