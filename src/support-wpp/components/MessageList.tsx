import React, { forwardRef, useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/@theme/ui/avatar";
import { ScrollArea } from "@/@theme/ui/scroll-area";
import { CheckCheck, Paperclip, Play, Pause, Mic } from "lucide-react";
import {
  WhatsAppConversation,
  WhatsAppDataMessage,
} from "../../organization/services/whatsapp.service";
import { cn } from "@/shared/lib/utils";

interface MessageListProps {
  messages: WhatsAppDataMessage[];
  selectedConversation: WhatsAppConversation;
  msgLoadingMore: boolean;
  msgStartRef: React.RefObject<HTMLDivElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  scrollViewportRef: React.RefObject<HTMLDivElement>;
  onLoadMore?: () => void;
}

const AudioMessagePlayer = ({
  msgUrl,
  direction,
  content,
}: {
  msgUrl: string;
  direction: "in" | "out";
  content: string;
}) => {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const requestRef = useRef<number>();

  const toggleAudio = () => {
    try {
      const audio = audioRef.current;
      if (!audio) return;
      if (audio.paused) {
        // Pause all other audios by dispatching a custom event if really needed.
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((e) => {
            console.error("Audio play failed:", e);
            setPlaying(false);
          });
        }
        setPlaying(true);
      } else {
        audio.pause();
        setPlaying(false);
      }
    } catch (err) {
      console.error("Synchronous audio play error:", err);
      setPlaying(false);
    }
  };

  const updateProgress = () => {
    if (playing && audioRef.current) {
      const audio = audioRef.current;
      const prog = (audio.currentTime / (audio.duration || 1)) * 100;
      setProgress(prog);
    }
    requestRef.current = requestAnimationFrame(updateProgress);
  };

  useEffect(() => {
    if (playing) {
      requestRef.current = requestAnimationFrame(updateProgress);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [playing]);

  return (
    <div className="w-[240px] bg-slate-100 rounded-full p-1.5 pr-3 flex items-center gap-3 border border-slate-200 shadow-sm relative overflow-hidden group">
      <audio
        src={msgUrl}
        ref={audioRef}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
        }}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        className="hidden"
      />
      <button
        onClick={toggleAudio}
        className={cn(
          "w-10 h-10 flex items-center justify-center rounded-full transition-colors flex-shrink-0 z-10 mx-0.5",
          direction === "out"
            ? "bg-orange-500 hover:bg-orange-600"
            : "bg-slate-300 hover:bg-slate-400"
        )}
      >
        {playing ? (
          <Pause className="w-4 h-4 text-white hover:scale-110 transition-transform" />
        ) : (
          <Play className="w-4 h-4 text-white hover:scale-110 transition-transform ml-0.5" />
        )}
      </button>
      <div className="flex-1 flex flex-col justify-center">
        <div className="h-1.5 w-full bg-slate-300 rounded-full overflow-hidden relative">
          <div
            className={cn(
              "absolute left-0 top-0 h-full transition-all duration-75",
              direction === "out" ? "bg-orange-500" : "bg-slate-500"
            )}
            style={{ width: `${progress || 0}%` }}
          />
        </div>
      </div>
      <div className="flex items-center flex-shrink-0 select-none bg-slate-200/80 px-2 py-0.5 rounded-full mr-1">
        <Mic
          className={cn(
            "w-3 h-3 mr-1 font-bold",
            direction === "in" ? "text-slate-500" : "text-orange-500"
          )}
        />
        <span className="text-[10px] font-bold text-slate-600 min-w-[28px]">
          {content.replace("[Ãudio] ", "").replace("[Ãudio]", "0:00")}
        </span>
      </div>
    </div>
  );
};

export const MessageList = forwardRef<HTMLDivElement, MessageListProps>(
  (
    {
      messages,
      selectedConversation,
      msgLoadingMore,
      msgStartRef,
      messagesEndRef,
      // scrollViewportRef is passed to ScrollArea via ref prop if needed
      onLoadMore,
    },
    ref // This ref will be attached to ScrollArea viewport
  ) => {
    const formatMediaUrl = (url: string, type: string) => {
      if (!url) return "";

      // Se for uma URL completa, blob, path relativo, ou base64 jÃ¡ prÃ©-formatado
      if (
        url.startsWith("http") ||
        url.startsWith("data:") ||
        url.startsWith("blob:") ||
        url.startsWith("/") ||
        url.includes("localhost")
      ) {
        // CorreÃ§Ã£o especÃ­fica se vier algo sem http localmente (ex: localhost:3000/media...)
        if (url.startsWith("localhost")) return `http://${url}`;
        return url;
      }

      // Se a string for relativamente curta e nÃ£o parecer um base64 (base64 costuma ter dezenas de kbps)
      if (url.length < 500 && !url.includes(";base64,")) {
        // Talvez seja uma URL faltando o 'https://' do S3/Evolution
        if (
          url.includes(".amazonaws.com") ||
          url.includes("storage.googleapis.com")
        )
          return `https://${url}`;
        if (!url.includes("/")) return url; // Se nÃ£o tem barras e Ã© curto, deixe como estÃ¡
      }

      // Caso contrÃ¡rio, injeta a tipagem MIME no Base64 RAW pra o navegador aceitar.
      let mimeType = "application/octet-stream";
      if (type === "audio") mimeType = "audio/ogg";
      else if (type === "image") mimeType = "image/jpeg";
      else if (type === "video" || type === "gif") mimeType = "video/mp4";
      else if (type === "sticker") mimeType = "image/webp";

      return `data:${mimeType};base64,${url}`;
    };

    return (
      <ScrollArea className="flex-1 bg-slate-50/50" ref={ref as any}>
        <div className="px-6 py-8 space-y-8 max-w-5xl mx-auto min-h-full flex flex-col justify-end">
          <div className="flex justify-center mb-4" ref={msgStartRef}>
            {msgLoadingMore ? (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="w-3 h-3 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
                Carregando mensagens anteriores...
              </div>
            ) : (
              onLoadMore && (
                <button
                  onClick={onLoadMore}
                  className="text-xs text-orange-600 hover:text-orange-700 font-medium py-1.5 px-3 bg-orange-50 hover:bg-orange-100 rounded-full transition-colors flex items-center gap-1"
                >
                  <span className="w-1 h-1 bg-current rounded-full" />
                  Carregar mensagens anteriores
                </button>
              )
            )}
          </div>

          {/* Date separator */}
          <div className="flex justify-center">
            <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-400 uppercase tracking-widest shadow-sm">
              Hoje
            </span>
          </div>

          {messages.map((msg) => {
            const isGroup =
              selectedConversation?.contactNumber?.includes("@g.us");
            const showSenderInfo = isGroup && msg.direction === "in";

            const participantId = msg.participant_id || "";
            const participantInfo =
              selectedConversation?.metadata?.participants?.[participantId];
            const senderName =
              participantInfo?.name ||
              msg.push_name ||
              participantId.split("@")[0] ||
              "UsuÃ¡rio";
            const senderPic =
              participantInfo?.profilePic || msg.sender_profile_pic_url;

            return (
              <div
                key={msg.id}
                className={cn(
                  "flex flex-col group",
                  msg.direction === "out" ? "items-end" : "items-start"
                )}
              >
                {showSenderInfo && (
                  <div className="flex items-center gap-1.5 mb-1 ml-1 opacity-80">
                    <Avatar className="w-5 h-5 border border-slate-200">
                      {senderPic && (
                        <AvatarImage src={senderPic} alt={senderName} />
                      )}
                      <AvatarFallback className="text-[7px] bg-slate-100 text-slate-500 font-bold">
                        {senderName.substring(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[10px] font-bold text-slate-500">
                      {senderName}
                    </span>
                  </div>
                )}
                <div
                  className={cn(
                    "relative max-w-[75%] rounded-2xl px-4 py-3 shadow-sm transition-all",
                    msg.direction === "out"
                      ? "bg-orange-600 text-white rounded-tr-none"
                      : "bg-white text-slate-800 rounded-tl-none border border-slate-100"
                  )}
                >
                  {msg.message_type === "image" && msg.media_url && (
                    <div className="mb-2 rounded-lg overflow-hidden bg-slate-100">
                      <img
                        src={formatMediaUrl(msg.media_url, "image")}
                        alt="Imagem"
                        className="max-w-full h-auto object-cover min-h-[100px] min-w-[100px]"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                        }}
                      />
                    </div>
                  )}
                  {msg.message_type === "video" && msg.media_url && (
                    <div className="mb-2 rounded-lg overflow-hidden bg-black">
                      <video
                        src={formatMediaUrl(msg.media_url, "video")}
                        controls
                        className="max-w-full h-auto"
                      />
                    </div>
                  )}
                  {msg.message_type === "gif" && msg.media_url && (
                    <div className="mb-2 rounded-lg overflow-hidden bg-black">
                      <video
                        src={formatMediaUrl(msg.media_url, "gif")}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="max-w-full h-auto"
                      />
                    </div>
                  )}
                  {msg.message_type === "sticker" && msg.media_url && (
                    <div className="mb-2 rounded-lg overflow-hidden bg-transparent">
                      <img
                        src={formatMediaUrl(msg.media_url, "sticker")}
                        alt="Figurinha"
                        className="max-w-[150px] h-auto object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                        }}
                      />
                    </div>
                  )}
                  {msg.message_type === "audio" && msg.media_url && (
                    <div className="mb-2">
                      <AudioMessagePlayer
                        msgUrl={formatMediaUrl(msg.media_url, "audio")}
                        direction={msg.direction}
                        content={msg.content}
                      />
                    </div>
                  )}
                  {msg.message_type === "document" && msg.media_url && (
                    <div className="mb-2 flex items-center gap-2 p-3 bg-slate-100 rounded-lg border border-slate-200">
                      <div className="bg-white p-2 rounded-md">
                        <Paperclip className="w-4 h-4 text-orange-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-xs font-semibold text-slate-700 truncate max-w-[150px]"
                          title={msg.content}
                        >
                          {["[Documento]"].includes(msg.content)
                            ? "Documento"
                            : msg.content}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Clique para baixar
                        </p>
                      </div>
                      <a
                        href={msg.media_url}
                        download={msg.content}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs bg-orange-600 text-white px-3 py-1.5 rounded-md hover:bg-orange-700 transition-colors"
                      >
                        Baixar
                      </a>
                    </div>
                  )}
                  {/* Hide content if it is just the placeholder, otherwise show as caption */}
                  {![
                    "[Imagem]",
                    "[VÃ­deo]",
                    "[Ãudio]",
                    "[Documento]",
                    "[GIF]",
                    "[Figurinha]",
                  ].includes(msg.content) && (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  )}
                </div>
                <div
                  className={cn(
                    "flex items-center gap-1 mt-1.5 px-1",
                    msg.direction === "out" ? "justify-end" : "justify-start"
                  )}
                >
                  <span className="text-[10px] font-medium text-slate-400">
                    {msg.sent_at ? format(new Date(msg.sent_at), "HH:mm") : ""}
                  </span>
                  {msg.direction === "out" && (
                    <CheckCheck className="w-3.5 h-3.5 text-orange-400" />
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
    );
  }
);

