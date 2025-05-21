import { useRef, useEffect, useState } from "react";
import { Terminal } from "xterm";
import "xterm/css/xterm.css";
import { invoke } from "@tauri-apps/api/core";

type Server = {
  ip: string;
  sshPort: number;
  sshUser: string;
  sshKey: string;
};

type Props = {
  server: Server;
};

const TerminalComponent: React.FC<Props> = ({ server }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [terminal, setTerminal] = useState<Terminal | null>(null);

  useEffect(() => {
    if (terminalRef.current && !terminal) {
      const term = new Terminal({
        fontFamily: "monospace",
        fontSize: 14,
        cursorBlink: true,
        theme: {
          background: "#000000",
          foreground: "#00FF00",
        },
      });

      term.open(terminalRef.current);
      setTerminal(term);

      invoke("start_ssh_session", {
        host: server.ip,
        port: server.sshPort,
        username: server.sshUser,
        keyPath: server.sshKey,
      })
        .then((sessionId) => {
          const id = sessionId as string;
          term.writeln(`✅ Sessione SSH avviata (ID: ${id})`);
        })
        .catch((err: unknown) => {
          term.writeln(`❌ Errore: ${String(err)}`);
        });
    }
  }, [terminalRef, terminal, server]);

  return <div ref={terminalRef} className="terminal" />;
};

export default TerminalComponent;