import React from "react";
import { Button } from "@/@theme/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/@theme/ui/popover";
import EmojiPicker from "emoji-picker-react";
import {
  FileText,
  Filter,
  Paperclip,
  Send,
  ShoppingBag,
  Smile,
} from "lucide-react";

interface MessageInputProps {
  newMessage: string;
  setNewMessage: (msg: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onEmojiClick: (emojiObject: any) => void;
  onOpenProductCatalog: () => void;
  onOpenOrderSelector: () => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  newMessage,
  setNewMessage,
  onSendMessage,
  onFileUpload,
  fileInputRef,
  onEmojiClick,
  onOpenProductCatalog,
  onOpenOrderSelector,
}) => {
  return (
    <div className="p-6 bg-white border-t border-slate-100">
      {/* Quick Replies */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-none">
        <Button
          variant="outline"
          size="sm"
          className="rounded-full bg-slate-50 border-slate-200 text-slate-600 text-[11px] font-bold gap-1.5 whitespace-nowrap h-8"
        >
          <Filter className="w-3.5 h-3.5" />
          Respostas RÃ¡pidas
        </Button>
        {/* Mock suggestions */}
        {[
          "OlÃ¡, tudo bem?",
          "Vou verificar agora",
          "Pode me enviar o comprovante?",
        ].map((s) => (
          <Button
            key={s}
            variant="ghost"
            size="sm"
            className="rounded-full bg-slate-50 text-slate-500 text-[11px] font-semibold whitespace-nowrap h-8"
            onClick={() => setNewMessage(s)}
          >
            {s}
          </Button>
        ))}
      </div>

      <form
        onSubmit={onSendMessage}
        className="relative flex items-end gap-3 max-w-5xl mx-auto"
      >
        <div className="flex-1 relative flex items-center bg-slate-100 rounded-2xl p-1 focus-within:ring-2 focus-within:ring-orange-100 transition-all">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-slate-400 hover:text-orange-600 rounded-xl"
            onClick={onOpenProductCatalog}
            title="CatÃ¡logo de Produtos"
          >
            <ShoppingBag className="w-5 h-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-slate-400 hover:text-orange-600 rounded-xl"
            onClick={onOpenOrderSelector}
            title="Enviar Pedido"
          >
            <FileText className="w-5 h-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-slate-400 hover:text-orange-600 rounded-xl"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="w-5 h-5" />
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={onFileUpload}
          />
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Escreva sua mensagem aqui..."
            rows={1}
            className="flex-1 bg-transparent border-none outline-none py-3 px-2 text-sm text-slate-800 placeholder:text-slate-400 resize-none min-h-[44px] max-h-32"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSendMessage(e as any);
              }
            }}
          />
          <div className="flex items-center pr-1">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 text-slate-400 hover:text-orange-600 rounded-xl"
                >
                  <Smile className="w-5 h-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-full p-0 border-none bg-transparent shadow-none"
                side="top"
                align="end"
              >
                <EmojiPicker onEmojiClick={onEmojiClick} />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <Button
          type="submit"
          disabled={!newMessage.trim()}
          className="h-11 w-11 rounded-2xl p-0 bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-200 shrink-0 transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none"
        >
          <Send className="w-5 h-5" />
        </Button>
      </form>
    </div>
  );
};

