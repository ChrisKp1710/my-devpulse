import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { useEnvironmentCheck } from "@/hooks/useEnvironmentCheck";
import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function SetupDialog() {
  const {
    isLoading,
    isInstalling,
    needsSetup,
    isReady,
    installProgress,
    installDependencies,
    checkEnvironment,
    systemInfo,
  } = useEnvironmentCheck();

  const show = isLoading || needsSetup || isInstalling || !isReady;

  useEffect(() => {
    if (!isLoading && needsSetup && !isInstalling) {
      installDependencies();
    }
  }, [isLoading, needsSetup, isInstalling, installDependencies]);

  useEffect(() => {
    if (!isInstalling && isReady) {
      toast.success("✅ DevPulse è pronta per l'uso!");
    }
  }, [isInstalling, isReady]);

  const renderIcon = () => {
    if (isLoading || (!isReady && !installProgress.isError)) {
      return <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />;
    }

    if (installProgress.isError) {
      return <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />;
    }

    return <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto" />;
  };

  return (
    <Dialog open={show}>
      <DialogContent className="max-w-md text-center py-6 space-y-4">
        {/* 🧠 Titolo stato */}
        <h2 className="text-xl font-bold">
          {installProgress.isError
            ? "Errore durante la configurazione"
            : isReady
            ? "✅ DevPulse è pronta"
            : "🛠️ Configurazione DevPulse"}
        </h2>

        {renderIcon()}

        {/* ℹ️ Stato tecnico */}
        {systemInfo && (
          <div className="text-xs text-muted-foreground">
            {systemInfo.os_version} • {systemInfo.chip}
            {systemInfo.supported ? (
              <Badge variant="default" className="ml-2">Chip supportato</Badge>
            ) : (
              <Badge variant="destructive" className="ml-2">Non supportato</Badge>
            )}
          </div>
        )}

        {/* 📋 Testo avanzamento */}
        <div className="text-sm text-muted-foreground">
          {installProgress.step}
          {installProgress.details && (
            <div className="mt-1 text-xs text-gray-500">{installProgress.details}</div>
          )}
        </div>

        {/* 📊 Barra progresso */}
        {!installProgress.isError && (
          <div className="w-full h-1.5 bg-gray-200 rounded overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${installProgress.progress}%` }}
            />
          </div>
        )}

        {/* 🔁 Bottone retry se errore */}
        {installProgress.isError && (
          <div className="pt-3">
            <Button
              variant="outline"
              onClick={() => {
                checkEnvironment();
                toast.info("🔁 Riprovo la configurazione...");
              }}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Riprova
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}