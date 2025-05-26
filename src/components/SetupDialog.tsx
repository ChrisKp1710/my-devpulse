import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { useEnvironmentCheck } from "@/hooks/useEnvironmentCheck";
import { useEffect, useState } from "react";
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

  const [forceClose, setForceClose] = useState(false);
  const show = !forceClose && (isLoading || needsSetup || isInstalling || !isReady);

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
      <DialogContent className="max-w-md text-center py-6 space-y-5">
        {/* 🧠 Titolo */}
        <h2 className="text-xl font-bold">
          {installProgress.isError
            ? "Errore durante la configurazione"
            : isReady
            ? "✅ DevPulse è pronta"
            : "🛠️ Configurazione DevPulse"}
        </h2>

        {renderIcon()}

        {/* 🖥️ Info sistema */}
        {systemInfo && (
          <div className="text-xs text-muted-foreground flex flex-wrap justify-center gap-2">
            <span>{systemInfo.os_version}</span>
            <span>•</span>
            <span>{systemInfo.chip}</span>
            {systemInfo.mac_model && (
              <>
                <span>•</span>
                <Badge variant="outline">Modello: {systemInfo.mac_model}</Badge>
              </>
            )}
            {systemInfo.supported ? (
              <Badge variant="default">Chip supportato</Badge>
            ) : (
              <Badge variant="destructive">Non supportato</Badge>
            )}
          </div>
        )}

        {/* 📋 Stato avanzamento */}
        <div className="text-sm text-muted-foreground">
          {installProgress.step}
          {installProgress.details && (
            <div className="mt-1 text-xs text-gray-500">{installProgress.details}</div>
          )}
        </div>

        {/* 📊 Barra di progresso */}
        {!installProgress.isError && (
          <div className="w-full h-1.5 bg-gray-200 rounded overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${installProgress.progress}%` }}
            />
          </div>
        )}

        {/* ❌ Errore → Riprova */}
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

        {/* ✅ Setup completato → Avvia */}
        {isReady && !isInstalling && (
          <div className="pt-4">
            <Button onClick={() => setForceClose(true)} className="w-full">
              🚀 Inizia a usare DevPulse
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}