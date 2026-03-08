import React from "react";
import { MessageSquare } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import {
  WhatsAppConversation,
  WhatsAppDataMessage,
  WhatsAppInstance,
} from "../../organization/services/whatsapp.service";
import { ChatHeader } from "./ChatHeader";
import { BannerNewClient } from "./BannerNewClient";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";

interface SupportChatAreaProps {
  selectedConversation: WhatsAppConversation | null;
  instances: WhatsAppInstance[];
  instance: WhatsAppInstance | null;
  user: any;
  onAssumeConversation: () => void;
  onTransferConversation: (targetUserId: string) => void;
  transferPopoverOpen: boolean;
  setTransferPopoverOpen: (open: boolean) => void;
  onCloseConversation: () => void;
  onOpenLinkClientDialog: () => void;
  onCadastrarNovoCliente: () => void;
  messages: WhatsAppDataMessage[];
  msgLoadingMore: boolean;
  msgStartRef: React.RefObject<HTMLDivElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  scrollViewportRef: React.RefObject<HTMLDivElement>;
  handleSendMessage: (e: React.FormEvent) => void;
  newMessage: string;
  setNewMessage: (msg: string) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setProductCatalogOpen: (open: boolean) => void;
  setOrderSelectorOpen: (open: boolean) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onEmojiClick: (emoji: any) => void;
  isRightPanelOpen: boolean;
  onToggleRightPanel: () => void;
  onLoadMore?: () => void;
}

export const SupportChatArea: React.FC<SupportChatAreaProps> = ({
  selectedConversation,
  instances,
  instance,
  user,
  onAssumeConversation,
  onTransferConversation,
  transferPopoverOpen,
  setTransferPopoverOpen,
  onCloseConversation,
  onOpenLinkClientDialog,
  onCadastrarNovoCliente,
  messages,
  msgLoadingMore,
  msgStartRef,
  messagesEndRef,
  scrollViewportRef,
  handleSendMessage,
  newMessage,
  setNewMessage,
  handleFileUpload,
  setProductCatalogOpen,
  setOrderSelectorOpen,
  fileInputRef,
  onEmojiClick,
  isRightPanelOpen,
  onToggleRightPanel,
  onLoadMore,
}) => {
  if (!selectedConversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-slate-50/30">
        <div className="w-20 h-20 bg-white shadow-xl shadow-slate-200/50 rounded-3xl flex items-center justify-center mb-6 border border-slate-100">
          <MessageSquare className="w-10 h-10 text-orange-500" />
        </div>
        <h3 className="text-xl font-bold text-slate-700">
          Inbox de Atendimento
        </h3>
        <p className="max-w-xs mt-3 text-slate-400 font-medium">
          Selecione uma conversa na lateral para comeÃ§ar a interagir em tempo
          real com seu cliente.
        </p>
      </div>
    );
  }

  return (
    <>
      <ChatHeader
        selectedConversation={selectedConversation}
        instances={instances}
        instance={instance}
        user={user}
        onAssumeConversation={onAssumeConversation}
        onTransferConversation={onTransferConversation}
        transferPopoverOpen={transferPopoverOpen}
        setTransferPopoverOpen={setTransferPopoverOpen}
        onCloseConversation={onCloseConversation}
        isRightPanelOpen={isRightPanelOpen}
        onToggleRightPanel={onToggleRightPanel}
      />
      <BannerNewClient
        selectedConversation={selectedConversation}
        onOpenLinkClientDialog={onOpenLinkClientDialog}
        onCadastrarNovoCliente={onCadastrarNovoCliente}
      />
      <MessageList
        messages={messages}
        selectedConversation={selectedConversation}
        msgLoadingMore={msgLoadingMore}
        msgStartRef={msgStartRef}
        messagesEndRef={messagesEndRef}
        ref={scrollViewportRef} // Pass directly to forwardRef
        scrollViewportRef={scrollViewportRef} // Also pass as prop if needed
        onLoadMore={onLoadMore}
      />
      <MessageInput
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        onSendMessage={handleSendMessage}
        onFileUpload={handleFileUpload}
        fileInputRef={fileInputRef}
        onEmojiClick={onEmojiClick}
        onOpenProductCatalog={() => setProductCatalogOpen(true)}
        onOpenOrderSelector={() => setOrderSelectorOpen(true)}
      />
    </>
  );
};

