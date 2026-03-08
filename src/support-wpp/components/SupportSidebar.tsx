import React, { useRef, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/@theme/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/@theme/ui/avatar";
import { ScrollArea } from "@/@theme/ui/scroll-area";
import { Badge } from "@/@theme/ui/badge";
import { Search, Filter, UserIcon, Mic } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import {
  WhatsAppConversation,
  WhatsAppInstance,
} from "../../organization/services/whatsapp.service";

import { Popover, PopoverContent, PopoverTrigger } from "@/@theme/ui/popover";
import { SingleUserSelector } from "@/components/Selectors/UserSelector";

interface SupportSidebarProps {
  conversations: WhatsAppConversation[];
  selectedConversation: WhatsAppConversation | null;
  onSelectConversation: (conversation: WhatsAppConversation) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeTab: "todos" | "meus" | "aguardando";
  setActiveTab: (tab: "todos" | "meus" | "aguardando") => void;
  loadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  instances: WhatsAppInstance[];
  filterUserId: string | null;
  setFilterUserId: (id: string | null) => void;
}

export const SupportSidebar: React.FC<SupportSidebarProps> = ({
  conversations,
  selectedConversation,
  onSelectConversation,
  searchQuery,
  setSearchQuery,
  activeTab,
  setActiveTab,
  loadingMore,
  hasMore,
  onLoadMore,
  instances,
  filterUserId,
  setFilterUserId,
}) => {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loadingMore, onLoadMore]);

  return (
    <div
      className={cn(
        "w-full md:w-[280px] lg:w-[320px] flex-shrink-0 flex flex-col bg-white border-r border-slate-200 transition-all",
        selectedConversation && "hidden md:flex"
      )}
    >
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">Atendimento</h2>
            <Badge className="bg-orange-100 text-orange-600 border-none hover:bg-orange-100 px-2 py-0.5 text-[10px] uppercase font-bold tracking-tight">
              Live
            </Badge>
          </div>
        </div>

        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-50 border-slate-200 focus-visible:ring-orange-500 h-10 transition-all text-sm"
            placeholder="Buscar conversas..."
          />
        </div>

        <div className="flex p-1 bg-slate-100 rounded-lg gap-1">
          {["todos", "meus", "aguardando"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={cn(
                "flex-1 py-1 text-xs font-semibold rounded-md transition-all capitalize",
                activeTab === tab
                  ? "bg-white text-orange-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
              )}
            >
              {tab}
            </button>
          ))}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "p-1 transition-colors rounded-md",
                  filterUserId
                    ? "bg-orange-100 text-orange-600"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
                )}
                title="Filtrar por usuÃ¡rio"
              >
                <Filter className="w-3.5 h-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="end">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">
                      Filtrar por atendente
                    </label>
                    {filterUserId && (
                      <button
                        onClick={() => setFilterUserId(null)}
                        className="text-xs text-red-500 hover:text-red-700 font-medium"
                      >
                        Limpar filtro
                      </button>
                    )}
                  </div>
                  <SingleUserSelector
                    selectedUser={filterUserId || ""}
                    onUserChange={(value) => setFilterUserId(value || null)}
                    placeholder="Selecione um usuÃ¡rio"
                    className="w-full"
                  />
                  <p className="text-xs text-slate-500">
                    Selecione um usuÃ¡rio para ver apenas as conversas atribuÃ­das
                    a ele na aba "Todos".
                  </p>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-2">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => onSelectConversation(conv)}
              className={cn(
                "group relative flex items-center gap-2 p-3 mb-1 mx-1 rounded-xl cursor-pointer transition-all",
                selectedConversation?.id === conv.id
                  ? "bg-orange-50 shadow-sm ring-1 ring-orange-100"
                  : "hover:bg-slate-50"
              )}
            >
              {/* Status indicator bar */}
              <div
                className={cn(
                  "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/5 rounded-full transition-all scale-y-75 group-hover:scale-y-100",
                  selectedConversation?.id === conv.id
                    ? "bg-orange-500"
                    : "bg-transparent"
                )}
              />

              <Avatar className="w-10 h-10 border-2 border-white shadow-sm ring-1 ring-slate-100 flex-shrink-0">
                {conv.profilePicUrl && (
                  <AvatarImage
                    src={conv.profilePicUrl}
                    alt={conv.contactName || conv.client?.name}
                  />
                )}
                <AvatarFallback className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                  {(
                    conv.client?.name ||
                    conv.contactName ||
                    conv.contactNumber
                  ).substring(0, 2)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="font-bold text-slate-900 truncate text-sm">
                    {conv.client?.name ||
                      conv.contactName ||
                      conv.contactNumber}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap ml-2 flex-shrink-0">
                    {conv.lastMessageAt
                      ? format(new Date(conv.lastMessageAt), "HH:mm")
                      : ""}
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <p className="flex items-center gap-1 text-xs text-slate-500 truncate leading-relaxed">
                    {conv.lastMessage?.includes("[Ãudio]") && (
                      <Mic
                        className={cn(
                          "w-3.5 h-3.5 flex-shrink-0",
                          conv.lastMessage?.includes("VocÃª:")
                            ? "text-slate-400"
                            : "text-emerald-500"
                        )}
                      />
                    )}
                    <span className="truncate">
                      {conv.lastMessage
                        ? conv.lastMessage.includes("[Ãudio]")
                          ? conv.lastMessage
                              .replace("[Ãudio] ", "")
                              .replace("VocÃª: [Ãudio]", "VocÃª:")
                          : conv.lastMessage
                        : "Nenhuma mensagem"}
                    </span>
                  </p>
                  <div className="flex gap-1 flex-wrap items-center">
                    {conv.assignedUser && (
                      <Badge className="bg-blue-100 text-blue-700 border-none px-1.5 py-0 text-[10px] uppercase font-bold h-4 flex items-center">
                        <UserIcon className="w-3 h-3 mr-1" />
                        {conv.assignedUser.name.split(" ")[0]}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {(conv.unreadCount ?? 0) > 0 && (
                <div className="ml-1 bg-orange-600 text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center shadow-md flex-shrink-0">
                  {conv.unreadCount}
                </div>
              )}
            </div>
          ))}

          {/* Infinite Scroll Trigger */}
          <div
            ref={loadMoreRef}
            className="h-10 flex items-center justify-center py-4"
          >
            {loadingMore && (
              <div className="flex items-center gap-2 text-slate-400">
                <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-semibold">
                  Carregando mais...
                </span>
              </div>
            )}
            {!hasMore && conversations.length > 0 && (
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                Fim das conversas
              </span>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

