import React from "react";
import {
  WhatsAppConversation,
  WhatsAppInstance,
} from "../../organization/services/whatsapp.service";
import { Avatar, AvatarFallback, AvatarImage } from "@/@theme/ui/avatar";
import { Button } from "@/@theme/ui/button";
import { Badge } from "@/@theme/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/@theme/ui/dropdown-menu";
import { ArrowLeft, MoreVertical, PanelRight, User } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { TransferConversationPopover } from "@/components/TransferConversationPopover";
import { useAuth } from "@/modules/auth";

interface ChatHeaderProps {
  selectedConversation: WhatsAppConversation;
  instances: WhatsAppInstance[];
  instance: WhatsAppInstance | null;
  user: any; // Ajustar tipagem do user se possÃ­vel
  onAssumeConversation: () => void;
  onTransferConversation: (targetUserId: string) => void;
  transferPopoverOpen: boolean;
  setTransferPopoverOpen: (open: boolean) => void;
  onCloseConversation: () => void; // Para mobile (setSelectedConversation(null))
  onToggleRightPanel: () => void;
  isRightPanelOpen: boolean;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  selectedConversation,
  instances,
  instance,
  user,
  onAssumeConversation,
  onTransferConversation,
  transferPopoverOpen,
  setTransferPopoverOpen,
  onCloseConversation,
  onToggleRightPanel,
  isRightPanelOpen,
}) => {
  return (
    <header className="h-[72px] flex items-center justify-between px-6 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden -ml-2 h-9 w-9"
          onClick={onCloseConversation}
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Button>
        <Avatar className="w-11 h-11 border-2 border-slate-50 shadow-sm">
          {selectedConversation.profilePicUrl && (
            <AvatarImage
              src={selectedConversation.profilePicUrl}
              alt={
                selectedConversation.client?.name ||
                selectedConversation.contactName
              }
            />
          )}
          <AvatarFallback className="bg-slate-100 text-slate-600 font-bold">
            {(
              selectedConversation.client?.name ||
              selectedConversation.contactName ||
              "WA"
            )
              .substring(0, 2)
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-bold text-slate-900 text-base leading-tight">
            {selectedConversation.client?.name ||
              selectedConversation.contactName ||
              selectedConversation.contactNumber}
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Online
            </span>
            <span className="text-slate-300">â€¢</span>
            <span className="text-[11px] font-medium text-slate-400">
              {selectedConversation.contactNumber.split("@")[0]}
            </span>
            {selectedConversation.contactNumber.includes("@g.us") && (
              <>
                <span className="text-slate-300">â€¢</span>
                <span className="text-[11px] font-bold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-full uppercase">
                  Grupo
                </span>
                {selectedConversation.metadata?.participants && (
                  <span className="text-[10px] text-slate-400 font-medium italic truncate max-w-[200px]">
                    {Object.values(selectedConversation.metadata.participants)
                      .map((p: any) => p.name || "Sem Nome")
                      .slice(0, 3)
                      .join(", ")}
                    {Object.keys(selectedConversation.metadata.participants)
                      .length > 3
                      ? ` e mais ${Object.keys(selectedConversation.metadata.participants).length - 3}`
                      : ""}
                  </span>
                )}
              </>
            )}
            {(() => {
              const currentInstance =
                instances.find(
                  (i) => i.id === selectedConversation.channelId
                ) || instance;
              if (!currentInstance) return null;
              return (
                <>
                  <span className="text-slate-300">â€¢</span>
                  <Badge
                    variant="outline"
                    className="text-[9px] px-1.5 py-0 border-slate-200 text-slate-500 font-bold uppercase"
                  >
                    {currentInstance.name || currentInstance.instanceName}
                  </Badge>
                </>
              );
            })()}
            {selectedConversation.assignedUser && (
              <>
                <span className="text-slate-300">â€¢</span>
                <Badge
                  variant="outline"
                  className="text-[9px] px-1.5 py-0 border-blue-200 text-blue-600 font-bold uppercase bg-blue-50"
                >
                  <User className="w-3 h-3 mr-1" />
                  {selectedConversation.assignedUser.name}
                </Badge>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-9 w-9 text-slate-400 hover:text-orange-600 hidden xl:flex",
            isRightPanelOpen && "bg-slate-100 text-orange-600"
          )}
          onClick={onToggleRightPanel}
          title={isRightPanelOpen ? "Ocultar painel" : "Mostrar painel"}
        >
          <PanelRight className="w-5 h-5" />
        </Button>

        {/* Only show Assumir button if conversation is not assigned to current user */}
        {(!selectedConversation.assignedUser ||
          selectedConversation.assignedUser.id !== user?.userId) && (
          <Button
            variant="outline"
            size="sm"
            className="hidden lg:flex gap-2 border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold h-9"
            onClick={onAssumeConversation}
          >
            Assumir
          </Button>
        )}
        <TransferConversationPopover
          onApply={onTransferConversation}
          triggerLabel="Transferir"
          open={transferPopoverOpen}
          onOpenChange={setTransferPopoverOpen}
          modal
        />
        <Button
          variant="destructive"
          size="sm"
          className="hidden lg:flex gap-2 font-semibold h-9"
        >
          Encerrar
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-slate-400 hover:text-slate-600"
            >
              <MoreVertical className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="lg:hidden text-slate-700"
              onClick={onAssumeConversation}
            >
              Assumir
            </DropdownMenuItem>
            <DropdownMenuItem
              className="lg:hidden text-slate-700"
              onClick={() => setTransferPopoverOpen(true)}
            >
              Transferir
            </DropdownMenuItem>
            <DropdownMenuItem className="lg:hidden text-red-600 focus:text-red-600">
              Encerrar
            </DropdownMenuItem>
            <DropdownMenuItem>Ver Contacto</DropdownMenuItem>
            <DropdownMenuItem>Limpar Conversa</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

