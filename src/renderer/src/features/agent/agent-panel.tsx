import { useEffect, useMemo, useState } from "react";
import { Bot, MessageSquare, Send, Trash2, X } from "lucide-react";

import { useAgentStore } from "./agent-store";

type AgentPanelProps = {
  isOpen: boolean;
  onClose: () => void;
};

const formatTime = (value: string) =>
  new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));

export function AgentPanel({ isOpen, onClose }: AgentPanelProps) {
  const status = useAgentStore((state) => state.status);
  const messages = useAgentStore((state) => state.messages);
  const isLoading = useAgentStore((state) => state.isLoading);
  const isSending = useAgentStore((state) => state.isSending);
  const error = useAgentStore((state) => state.error);
  const loadMessages = useAgentStore((state) => state.loadMessages);
  const loadStatus = useAgentStore((state) => state.loadStatus);
  const sendMessage = useAgentStore((state) => state.sendMessage);
  const clearMessages = useAgentStore((state) => state.clearMessages);
  const clearError = useAgentStore((state) => state.clearError);

  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    void loadMessages("desktop");
    void loadStatus();
  }, [isOpen, loadMessages, loadStatus]);

  const helperText = useMemo(() => {
    if (!status) {
      return "Agent hazirlaniyor.";
    }

    return [
      status.organizationName ?? "Domizan",
      status.telegram.enabled
        ? status.telegram.running
          ? "Telegram bagli"
          : "Telegram token var ama bot bekliyor"
        : "Telegram token henuz yok"
    ].join(" | ");
  }, [status]);

  const handleSend = async () => {
    const prompt = draft.trim();
    if (!prompt) {
      return;
    }

    setDraft("");
    clearError();
    await sendMessage(prompt, "desktop");
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="agent-panel-overlay" role="presentation">
      <div className="agent-panel">
        <div className="agent-panel__header">
          <div>
            <p className="eyebrow">Domizan Agent</p>
            <h3>Ofis asistani</h3>
            <p>{helperText}</p>
          </div>

          <div className="agent-panel__actions">
            <button className="secondary-button" onClick={() => void clearMessages("desktop")} type="button">
              <Trash2 size={16} />
              <span>Temizle</span>
            </button>
            <button className="sheet-close-button" onClick={onClose} type="button">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="agent-panel__status-row">
          <span className={`settings-chip ${status?.gemini.configured ? "settings-chip--ready" : "settings-chip--muted"}`}>
            Gemini {status?.gemini.configured ? "hazir" : "yok"}
          </span>
          <span className={`settings-chip ${status?.telegram.enabled ? "settings-chip--ready" : "settings-chip--muted"}`}>
            Telegram {status?.telegram.enabled ? "aktif" : "bekliyor"}
          </span>
          {status?.lastSyncAt && (
            <span className="settings-chip settings-chip--accent">
              Son sync {formatTime(status.lastSyncAt)}
            </span>
          )}
        </div>

        {error && <div className="inline-error">{error}</div>}

        <div className="agent-panel__messages">
          {isLoading ? (
            <div className="agent-empty-state">
              <MessageSquare size={22} />
              <p>Mesajlar yukleniyor.</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="agent-empty-state">
              <Bot size={22} />
              <p>
                Gunluk brif, gelen kutusu, resmi gazete veya bir mukellef adiyla soruya baslayabilirsin.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`agent-message ${message.role === "user" ? "agent-message--user" : "agent-message--assistant"}`}
              >
                <div className="agent-message__meta">
                  <strong>{message.role === "user" ? "Sen" : "Domizan"}</strong>
                  <span>{formatTime(message.createdAt)}</span>
                </div>
                <div className="agent-message__content">{message.content}</div>
              </div>
            ))
          )}
        </div>

        <div className="agent-panel__composer">
          <textarea
            className="settings-input agent-panel__textarea"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleSend();
              }
            }}
            placeholder="Gunluk brif, gelen kutusu, resmi gazete veya bir mukellef sor..."
            value={draft}
          />
          <button className="primary-button" disabled={isSending || !draft.trim()} onClick={() => void handleSend()} type="button">
            <Send size={16} />
            <span>{isSending ? "Gonderiliyor" : "Gonder"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
