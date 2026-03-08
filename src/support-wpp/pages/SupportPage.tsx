import { useRef, useState, useEffect, useMemo, useLayoutEffect } from "react";
import whatsappService, {
  WhatsAppConversation,
  WhatsAppDataMessage,
  WhatsAppInstance,
} from "../../organization/services/whatsapp.service";
import { Input } from "@/@theme/ui/input";
import useNotification from "@/hooks/useNotification";
import { cn } from "@/shared/lib/utils";
import { useAuth } from "@/modules/auth";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useClientOrders } from "@/modules/clients/hooks/useClientOrders";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/@theme/ui/dialog";
import { clientsService } from "@/modules/clients/services/clients.service";
import { IClientSimples } from "@/modules/clients/dto/client.dto";
import { SupportChatArea } from "../components/SupportChatArea";
import { SupportSidebar } from "../components/SupportSidebar";
import { SupportRightPanel } from "../components/SupportRightPanel";
import { ProductCatalogModal } from "../components/ProductCatalogModal";
import { OrderSelectorModal } from "../components/OrderSelectorModal";
import { Button } from "@/@theme/ui/button";
import { AlertCircle } from "lucide-react";

const SupportPage = () => {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>(
    []
  );

  const [selectedConversation, setSelectedConversation] =
    useState<WhatsAppConversation | null>(null);
  const [messages, setMessages] = useState<WhatsAppDataMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [msgPage, setMsgPage] = useState(1);
  const [msgHasMore, setMsgHasMore] = useState(true);
  const [msgLoadingMore, setMsgLoadingMore] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { notify } = useNotification();
  const [activeTab, setActiveTab] = useState<"todos" | "meus" | "aguardando">(
    "todos"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [instance, setInstance] = useState<WhatsAppInstance | null>(null);
  const [disconnectedInstances, setDisconnectedInstances] = useState<
    WhatsAppInstance[]
  >([]);
  const [disconnectedModalOpen, setDisconnectedModalOpen] = useState(false);

  // UI State
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [productCatalogOpen, setProductCatalogOpen] = useState(false);
  const [orderSelectorOpen, setOrderSelectorOpen] = useState(false);
  const [filterUserId, setFilterUserId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const msgStartRef = useRef<HTMLDivElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [prevScrollHeight, setPrevScrollHeight] = useState(0);
  const [transferPopoverOpen, setTransferPopoverOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Link client (when conversation has no client)
  const [linkClientDialogOpen, setLinkClientDialogOpen] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [clientSearchResults, setClientSearchResults] = useState<
    IClientSimples[]
  >([]);
  const [clientSearchLoading, setClientSearchLoading] = useState(false);
  const [linkClientLoading, setLinkClientLoading] = useState(false);

  const fetchConversations = async (
    query?: string,
    tab?: string,
    pageNum = 1,
    append = false
  ) => {
    try {
      if (append) setLoadingMore(true);
      else {
        setLoading(true);
        setPage(1);
      }

      const params: any = {
        page: pageNum,
        limit: 20,
      };
      if (query) params.search = query;

      const currentTab = tab ?? activeTab;
      if (currentTab === "meus" && user?.entity?.id) {
        params.assignedUserId = user.entity.id;
      } else if (currentTab === "aguardando") {
        params.unassigned = true;
      } else if (currentTab === "todos" && filterUserId) {
        params.assignedUserId = filterUserId;
      }

      const response = await whatsappService.getConversations(params);
      const data = response.data || [];

      if (append) {
        setConversations((prev) => [...prev, ...data]);
      } else {
        setConversations(data);
      }

      setHasMore(data.length > 0 && pageNum < response.totalPage);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (hasMore && !loadingMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchConversations(searchQuery, activeTab, nextPage, true);
    }
  };

  const fetchInstances = async () => {
    try {
      const data = await whatsappService.getInstances();
      setInstances(data);
      if (data.length > 0) {
        setInstance(data[0]);
      }

      // Check for disconnected instances
      const disconnected = data.filter(
        (inst) => inst.status !== "connected" && inst.status !== "connecting"
      );
      if (disconnected.length > 0) {
        setDisconnectedInstances(disconnected);
        setDisconnectedModalOpen(true);
      }
    } catch (error) {
      console.error("Error fetching instances:", error);
    }
  };

  const fetchMessages = async (id: string, pageNum = 1, append = false) => {
    try {
      if (append) setMsgLoadingMore(true);
      else {
        setMsgPage(1);
        setMsgHasMore(true);
      }

      const response = await whatsappService.getMessages(id, {
        page: pageNum,
        limit: 30,
      });

      // Data comes in DESC (newest first). For display, we want oldest first in the final array.
      // But if we are loading MORE (older), we prepend them.
      const reversedNewData = [...response.data].reverse();

      if (append) {
        setMessages((prev) => [...reversedNewData, ...prev]);
      } else {
        setMessages(reversedNewData);
      }

      setMsgHasMore(pageNum < response.totalPage);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setMsgLoadingMore(false);
    }
  };

  useLayoutEffect(() => {
    if (msgLoadingMore && scrollViewportRef.current) {
      setPrevScrollHeight(scrollViewportRef.current.scrollHeight);
    }
  }, [msgLoadingMore]);

  useLayoutEffect(() => {
    if (!msgLoadingMore && prevScrollHeight > 0 && scrollViewportRef.current) {
      const newScrollHeight = scrollViewportRef.current.scrollHeight;
      const diff = newScrollHeight - prevScrollHeight;
      scrollViewportRef.current.scrollTop += diff;
      setPrevScrollHeight(0);
    }
  }, [messages, msgLoadingMore, prevScrollHeight]);

  const handleLoadMoreMessages = () => {
    if (msgHasMore && !msgLoadingMore && selectedConversation) {
      fetchMessages(selectedConversation.id, msgPage + 1, true);
      setMsgPage((prev) => prev + 1);
    }
  };

  useEffect(() => {
    fetchInstances();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchConversations(searchQuery, activeTab, 1, false);
    }, 400);

    const interval = setInterval(() => {
      fetchConversations(searchQuery, activeTab, 1, false);
    }, 10000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [searchQuery, activeTab, user?.entity?.id, filterUserId]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          handleLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, page]);

  /* 
    Refreshes messages in the background without resetting the view or page count.
    Only appends completely new messages to the bottom.
  */
  const refreshMessages = async (id: string) => {
    try {
      const response = await whatsappService.getMessages(id, {
        page: 1, // Always check the latest messages
        limit: 30,
      });

      // Newest messages come first in response.data (DESC), so we reverse them for comparison/appending (ASC).
      const newMessagesAsc = [...response.data].reverse();

      setMessages((prevMessages) => {
        // If we have no messages yet, just use the new ones
        if (prevMessages.length === 0) return newMessagesAsc;

        // Create a Set of existing IDs for efficient lookup
        const existingIds = new Set(prevMessages.map((m) => m.id));

        // Filter out messages that already exist
        const trulyNewMessages = newMessagesAsc.filter(
          (m) => !existingIds.has(m.id)
        );

        if (trulyNewMessages.length === 0) {
          return prevMessages; // No changes
        }

        // Return existing messages + new unique messages appended to the end
        return [...prevMessages, ...trulyNewMessages];
      });

      // If we are at the bottom (page 1), we might want to ensure we stay at bottom or show a notification?
      // The scroll useEffect handles scrolling to bottom if msgPage === 1.
    } catch (error) {
      console.error("Error refreshing messages:", error);
    }
  };

  useEffect(() => {
    if (selectedConversation) {
      // Initial load
      fetchMessages(selectedConversation.id);
      whatsappService.markAsRead(selectedConversation.id);

      const interval = setInterval(
        () => refreshMessages(selectedConversation.id),
        3000
      );
      return () => clearInterval(interval);
    }
  }, [selectedConversation]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && msgHasMore && !msgLoadingMore) {
          handleLoadMoreMessages();
        }
      },
      { threshold: 0.1 }
    );

    if (msgStartRef.current) {
      observer.observe(msgStartRef.current);
    }

    return () => observer.disconnect();
  }, [msgHasMore, msgLoadingMore, messages]);

  useEffect(() => {
    if (!msgLoadingMore && msgPage === 1) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, msgLoadingMore, msgPage]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation || !instance) return;

    try {
      // 1. Convert file to Base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });

      const fileName = file.name;
      const fileType = file.type;

      // Determine media type
      let mediaType: "image" | "video" | "audio" | "document" = "document";
      if (fileType.startsWith("image/")) mediaType = "image";
      else if (fileType.startsWith("video/")) mediaType = "video";
      else if (fileType.startsWith("audio/")) mediaType = "audio";

      // 2. Send media message directly via WhatsApp (Evolution API accepts Base64)
      await whatsappService.sendMediaMessage("whatsapp", {
        phoneNumber: selectedConversation.contactNumber,
        mediaUrl: base64, // Sending base64 as mediaUrl (mapped to 'media' in backend)
        mediaType,
        mimetype: fileType, // Pass original mimetype
        fileName,
        caption: fileName,
      });

      notify("Arquivo enviado com sucesso!", "success");
      fetchMessages(selectedConversation.id, 1, false);
    } catch (error) {
      console.error("Error uploading file:", error);
      notify("Erro ao enviar arquivo.", "error");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onEmojiClick = (emojiObject: any) => {
    setNewMessage((prev) => prev + emojiObject.emoji);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    const text = newMessage;
    setNewMessage("");

    try {
      await whatsappService.sendMessage(
        selectedConversation.contactNumber || "",
        text,
        selectedConversation.channelId
      );
      fetchMessages(selectedConversation.id);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleAssumeConversation = async () => {
    if (!selectedConversation) return;
    try {
      await whatsappService.assignConversation(selectedConversation.id);
      notify("Conversa assumida com sucesso!", "success");

      // Refresh the conversation list to get updated assignedUser data
      fetchConversations(searchQuery, activeTab, 1, false);
    } catch (error) {
      console.error("Error assuming conversation:", error);
      notify("Erro ao assumir conversa.", "error");
    }
  };

  const handleTransferConversation = async (targetUserId: string) => {
    if (!selectedConversation) return;

    try {
      await whatsappService.transferConversation(
        selectedConversation.id,
        targetUserId
      );
      notify("Conversa transferida com sucesso!", "success");

      // Refresh the conversation list to get updated assignedUser data
      fetchConversations(searchQuery, activeTab, 1, false);
    } catch (error) {
      console.error("Error transferring conversation:", error);
      notify("Erro ao transferir conversa.", "error");
    }
  };

  const handleOpenLinkClientDialog = () => {
    setClientSearchQuery("");
    setClientSearchResults([]);
    setLinkClientDialogOpen(true);
  };

  useEffect(() => {
    if (!linkClientDialogOpen) return;
    const query = clientSearchQuery.trim();
    if (!query) {
      setClientSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setClientSearchLoading(true);
      try {
        const result = await clientsService().findAllClientsSimples(
          1,
          20,
          query
        );
        setClientSearchResults(result.data || []);
      } catch (error) {
        console.error("Error searching clients:", error);
        setClientSearchResults([]);
        notify("Erro ao buscar clientes.", "error");
      } finally {
        setClientSearchLoading(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [linkClientDialogOpen, clientSearchQuery]);

  const handleLinkClient = async (clientId: string) => {
    if (!selectedConversation) return;
    setLinkClientLoading(true);
    try {
      const updated = await whatsappService.linkClient(
        selectedConversation.id,
        clientId
      );
      setSelectedConversation(updated);
      setConversations((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c))
      );
      setLinkClientDialogOpen(false);
      notify("Cliente vinculado com sucesso!", "success");
    } catch (error) {
      console.error("Error linking client:", error);
      notify("Erro ao vincular cliente.", "error");
    } finally {
      setLinkClientLoading(false);
    }
  };

  const handleCadastrarNovoCliente = () => {
    if (!selectedConversation) return;
    navigate("/clients/create", {
      state: {
        fromChat: true,
        contactNumber: selectedConversation.contactNumber,
      },
    });
  };

  const clientId =
    selectedConversation?.client?.id ??
    (selectedConversation?.client as { client_id?: string })?.client_id;
  const { data: clientDetails } = useQuery({
    queryKey: ["client", clientId],
    queryFn: () => clientsService().findOneClient(clientId!),
    enabled: !!clientId,
  });
  const { orders, loading: ordersLoading } = useClientOrders(clientId);
  const lastOrders = orders?.data?.slice(0, 2) ?? [];

  const filteredConversations = useMemo(() => {
    // Backend already filters, but we keep a safety check and local search for instant feel
    return conversations.filter((conv) => {
      if (!conv) return false;

      // Safety check to avoid the "includes of undefined" error
      const contactNum = conv.contactNumber || "";
      const contactNm = conv.contactName || "";
      const clientNm = conv.client?.name || "";

      const matchesSearch =
        contactNum.includes(searchQuery) ||
        contactNm.toLowerCase().includes(searchQuery.toLowerCase()) ||
        clientNm.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSearch;
    });
  }, [conversations, searchQuery]);

  return (
    <div className="flex h-[100dvh] bg-[#F8FAFC] overflow-hidden m-0">
      <SupportSidebar
        conversations={filteredConversations}
        selectedConversation={selectedConversation}
        onSelectConversation={setSelectedConversation}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        loadingMore={loadingMore}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
        instances={instances}
      />

      <div
        className={cn(
          "flex-1 flex flex-col bg-white relative",
          !selectedConversation && "hidden md:flex"
        )}
      >
        <SupportChatArea
          selectedConversation={selectedConversation}
          instances={instances}
          instance={instance}
          user={user}
          onAssumeConversation={handleAssumeConversation}
          onTransferConversation={handleTransferConversation}
          transferPopoverOpen={transferPopoverOpen}
          setTransferPopoverOpen={setTransferPopoverOpen}
          onCloseConversation={() => setSelectedConversation(null)}
          onOpenLinkClientDialog={handleOpenLinkClientDialog}
          onCadastrarNovoCliente={handleCadastrarNovoCliente}
          messages={messages}
          msgLoadingMore={msgLoadingMore}
          msgStartRef={msgStartRef}
          messagesEndRef={messagesEndRef}
          scrollViewportRef={scrollViewportRef}
          handleSendMessage={handleSendMessage}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          handleFileUpload={handleFileUpload}
          setProductCatalogOpen={setProductCatalogOpen}
          setOrderSelectorOpen={setOrderSelectorOpen}
          fileInputRef={fileInputRef}
          onEmojiClick={onEmojiClick}
          isRightPanelOpen={isRightPanelOpen}
          onToggleRightPanel={() => setIsRightPanelOpen(!isRightPanelOpen)}
          onLoadMore={handleLoadMoreMessages}
        />
      </div>

      {selectedConversation && isRightPanelOpen && (
        <SupportRightPanel
          selectedConversation={selectedConversation}
          clientId={clientId}
          clientDetails={clientDetails}
          lastOrders={lastOrders || []}
        />
      )}

      {/* Modal: Buscar cliente para vincular */}
      <Dialog
        open={linkClientDialogOpen}
        onOpenChange={setLinkClientDialogOpen}
      >
        <DialogContent className="sm:max-w-md" allowOverflow>
          <DialogHeader>
            <DialogTitle>Vincular cliente Ã  conversa</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500">
            Busque um cliente na sua base para vincular a esta conversa de
            WhatsApp.
          </p>
          <Input
            placeholder="Nome, CNPJ ou CPF..."
            value={clientSearchQuery}
            onChange={(e) => setClientSearchQuery(e.target.value)}
            className="mt-2"
          />
          <div className="mt-3 max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/50">
            {clientSearchLoading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-slate-500 text-sm">
                <span className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                Buscando...
              </div>
            ) : clientSearchResults.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">
                {clientSearchQuery.trim()
                  ? "Nenhum cliente encontrado. Tente outro termo."
                  : "Digite acima para buscar um cliente."}
              </div>
            ) : (
              <ul className="divide-y divide-slate-200">
                {clientSearchResults.map((client) => {
                  const displayName =
                    client.tipo === "J"
                      ? client.nome_fantasia || client.razao_social
                      : client.razao_social;
                  return (
                    <li key={client.id}>
                      <button
                        type="button"
                        onClick={() => handleLinkClient(client.id)}
                        disabled={linkClientLoading}
                        className="w-full px-4 py-3 text-left hover:bg-orange-50 transition-colors flex items-center justify-between gap-2"
                      >
                        <span className="font-medium text-slate-900 truncate">
                          {displayName}
                        </span>
                        {client.cnpj && (
                          <span className="text-xs text-slate-400 font-mono flex-shrink-0">
                            {client.cnpj}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ProductCatalogModal
        open={productCatalogOpen}
        onOpenChange={setProductCatalogOpen}
        onSelectProduct={async (product) => {
          if (!selectedConversation) return;

          const formatPrice = (value?: number) => {
            if (value === undefined || value === null) return "R$ 0,00";
            return new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(value);
          };

          const caption =
            `*${product.name}*\n` +
            `*PreÃ§o:* ${formatPrice(product.price)}\n` +
            (product.description ? `\n${product.description}` : "") +
            (product.sku ? `\nSKU: ${product.sku}` : "");

          try {
            if (
              product.files &&
              product.files.length > 0 &&
              product.files[0].url
            ) {
              await whatsappService.sendMediaMessage("whatsapp", {
                phoneNumber: selectedConversation.contactNumber,
                mediaUrl: product.files[0].url,
                mediaType: "image",
                mimetype: "image/jpeg",
                fileName: product.name,
                caption: caption,
              });
            } else {
              await whatsappService.sendMessage(
                selectedConversation.contactNumber || "",
                caption,
                selectedConversation.channelId
              );
            }
            notify("Produto enviado com sucesso!", "success");
            fetchMessages(selectedConversation.id);
            setProductCatalogOpen(false);
          } catch (error) {
            console.error("Error sending product:", error);
            notify("Erro ao enviar produto.", "error");
          }
        }}
      />

      <OrderSelectorModal
        open={orderSelectorOpen}
        onOpenChange={setOrderSelectorOpen}
        clientId={clientId}
        onSelectOrder={async (order, url) => {
          if (!selectedConversation) return;

          const formatPrice = (value?: number) => {
            if (value === undefined || value === null) return "R$ 0,00";
            return new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(value);
          };

          const text =
            `*Pedido #${order.order_number}*\n` +
            `*Total:* ${formatPrice(order.total_amount)}\n\n` +
            `Acesse o pedido aqui: ${url}`;

          try {
            await whatsappService.sendMessage(
              selectedConversation.contactNumber || "",
              text,
              selectedConversation.channelId
            );
            notify("Pedido enviado com sucesso!", "success");
            fetchMessages(selectedConversation.id);
            setOrderSelectorOpen(false);
          } catch (error) {
            console.error("Error sending order:", error);
            notify("Erro ao enviar pedido.", "error");
          }
        }}
      />

      {/* Modal de Alerta: Dispositivos Desconectados */}
      <Dialog
        open={disconnectedModalOpen}
        onOpenChange={setDisconnectedModalOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="w-5 h-5" />
              AtenÃ§Ã£o: Dispositivos Desconectados
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Detectamos que os seguintes dispositivos do WhatsApp estÃ£o
              desconectados. As mensagens nÃ£o serÃ£o enviadas ou recebidas por
              eles atÃ© que a conexÃ£o seja restabelecida:
            </p>
            <ul className="space-y-2 bg-slate-50 border border-slate-100 p-3 rounded-lg max-h-40 overflow-y-auto">
              {disconnectedInstances.map((inst, index) => (
                <li
                  key={inst.id || index}
                  className="text-sm font-medium text-slate-800 flex items-center justify-between"
                >
                  <span>
                    {inst.name || inst.instanceName || "Canal Desconhecido"}
                  </span>
                  <span className="text-xs bg-rose-100 text-rose-700 px-2 py-1 rounded-full uppercase tracking-wider font-bold">
                    Offline
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-500">
              VÃ¡ em <strong>OrganizaÃ§Ã£o &gt; IntegraÃ§Ãµes &gt; WhatsApp</strong>{" "}
              para ler o QR Code novamente.
            </p>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setDisconnectedModalOpen(false)}
            >
              Ignorar
            </Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700"
              onClick={() => {
                setDisconnectedModalOpen(false);
                navigate("/organization/integrations/whatsapp");
              }}
            >
              Conectar Agora
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupportPage;

