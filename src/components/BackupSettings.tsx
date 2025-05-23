// src/components/BackupSettings.tsx

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";
import { DownloadCloud, Upload } from "lucide-react";

const BackupSettings: React.FC = () => {
  const handleExportServers = async () => {
    try {
      const jsonData = await invoke<string>("export_servers_json");
      const blob = new Blob([jsonData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `devpulse-servers-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "✅ Export completed",
        description: "Server configurations exported successfully.",
      });
    } catch (err) {
      console.error("Export error:", err);
      toast({
        title: "❌ Failed to export servers",
        description: String(err),
        variant: "destructive",
      });
    }
  };

  const handleImportServers = async () => {
    try {
      const selected = await open({
        filters: [{ name: "JSON Files", extensions: ["json"] }],
        multiple: false,
      });

      if (!selected || typeof selected !== "string") return;

      const jsonData = await readTextFile(selected);
      const importedCount = await invoke<number>("import_servers_json", {
        jsonData,
      });

      toast({
        title: "✅ Import completed",
        description: `Successfully imported ${importedCount} servers.`,
      });
    } catch (err) {
      console.error("Import error:", err);
      toast({
        title: "❌ Failed to import servers",
        description: String(err),
        variant: "destructive",
      });
    }
  };

  return (
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
            <Button className="flex items-center gap-2" onClick={handleExportServers}>
              <DownloadCloud className="h-4 w-4" /> Export Servers
            </Button>
            <Button className="flex items-center gap-2" variant="outline" onClick={handleImportServers}>
              <Upload className="h-4 w-4" /> Import Servers
            </Button>
            <p className="text-sm text-muted-foreground">
              Server configurations are exported as a JSON file that you can save as a backup.
              You can later import this file to restore all your servers.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BackupSettings;