import React from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/@theme/ui/avatar";
import { ScrollArea } from "@/@theme/ui/scroll-area";
import { Badge } from "@/@theme/ui/badge";
import { Button } from "@/@theme/ui/button";
import { Mail, Phone, ExternalLink, ChevronRight, Package } from "lucide-react";
import { WhatsAppConversation } from "../../organization/services/whatsapp.service";
import { OrderDto } from "@/modules/orders/dto/Order.dto";
import { ClientNotes } from "@/modules/clients/components/ClientNotes";
import {
  getOrderBillingStatusBadgeColor,
  getOrderBillingStatusLabel,
} from "@/shared/utils/orderUtils";

interface SupportRightPanelProps {
  selectedConversation: WhatsAppConversation;
  clientId?: string;
  clientDetails?: any;
  lastOrders: OrderDto[];
}

export const SupportRightPanel: React.FC<SupportRightPanelProps> = ({
  selectedConversation,
  clientId,
  clientDetails,
  lastOrders,
}) => {
  const navigate = useNavigate();

  return (
    <aside className="hidden xl:flex w-[320px] lg:w-[350px] flex-col bg-white border-l border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden">
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {selectedConversation.client ? (
            <>
              {/* Header Info */}
              <div className="flex flex-col items-center pb-6 border-b border-slate-50">
                <Avatar className="w-24 h-24 mb-4 ring-4 ring-orange-50/50">
                  <AvatarFallback className="text-2xl font-bold bg-slate-50 text-slate-500">
                    {(selectedConversation.client.name || "??")
                      .substring(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-1.5 mb-1">
                  <h3 className="font-bold text-slate-900 text-lg text-center">
                    {selectedConversation.client.name}
                  </h3>
                  {clientId && (
                    <button
                      type="button"
                      className="p-1 hover:bg-slate-100 rounded-md transition-colors"
                      onClick={() => navigate(`/clients/view/${clientId}`)}
                      aria-label="Abrir cliente no CRM"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  )}
                </div>
              </div>

              {/* Contact Section */}
              <div className="space-y-4">
                <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">
                  InformaÃ§Ãµes de Contato
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 group">
                    <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-orange-50 transition-colors">
                      <Mail className="w-4 h-4 text-slate-400 group-hover:text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-slate-400 font-medium">
                        E-mail
                      </p>
                      <p className="text-sm font-semibold text-slate-700 truncate">
                        {selectedConversation.client.email ||
                          clientDetails?.email_principal ||
                          "NÃ£o informado"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 group">
                    <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-orange-50 transition-colors">
                      <Phone className="w-4 h-4 text-slate-400 group-hover:text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-slate-400 font-medium">
                        Telefone
                      </p>
                      <p className="text-sm font-semibold text-slate-700 truncate">
                        {selectedConversation.contactNumber.split("@")[0]}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pedidos Recentes */}
              {clientId && (
                <div className="space-y-4 pt-4 border-t border-slate-50">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Package className="w-3 h-3" />
                      Pedidos Recentes
                    </h4>
                    <button
                      onClick={() => navigate(`/clients/view/${clientId}`)}
                      className="text-[10px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-0.5"
                    >
                      Ver todos <ChevronRight className="w-2.5 h-2.5" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {lastOrders.length > 0 ? (
                      lastOrders.map((order) => (
                        <div
                          key={order.id}
                          className="group flex flex-col gap-2 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-sm hover:border-orange-100 transition-all cursor-pointer"
                          onClick={() =>
                            navigate(`/orders/details/${order.id}`)
                          }
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700 group-hover:text-orange-600 transition-colors">
                              #{order.order_number}
                            </span>
                            <Badge
                              className={`text-[9px] px-1.5 py-0 h-4 ${getOrderBillingStatusBadgeColor(
                                order.billing_status || ""
                              )}`}
                            >
                              {getOrderBillingStatusLabel(
                                order.billing_status || ""
                              )}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500 font-medium">
                              {new Date(order.created_at).toLocaleDateString(
                                "pt-BR"
                              )}
                            </span>
                            <span className="font-bold text-slate-900">
                              {new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              }).format(order.total_amount || 0)}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                        <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs text-slate-400 font-medium">
                          Nenhum pedido recente
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* BotÃ£o HistÃ³rico Completo */}
              <div className="pt-2">
                {clientId && (
                  <Button
                    variant="outline"
                    className="w-full text-[11px] font-bold rounded-lg"
                    onClick={() => navigate(`/clients/view/${clientId}`)}
                  >
                    Ver todo histÃ³rico
                  </Button>
                )}
              </div>

              {/* Notas Internas */}
              {clientId && (
                <div className="pt-4 border-t border-slate-50">
                  <ClientNotes clientId={clientId} />
                </div>
              )}
            </>
          ) : selectedConversation.contactNumber.includes("@g.us") ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center pb-6 border-b border-slate-50">
                <Avatar className="w-24 h-24 mb-4 ring-4 ring-orange-50/50">
                  {selectedConversation.profilePicUrl && (
                    <AvatarImage src={selectedConversation.profilePicUrl} />
                  )}
                  <AvatarFallback className="text-2xl font-bold bg-orange-50 text-orange-600">
                    {selectedConversation.contactName
                      ?.substring(0, 2)
                      .toUpperCase() || "GR"}
                  </AvatarFallback>
                </Avatar>
                <h3 className="font-bold text-slate-900 text-lg text-center">
                  {selectedConversation.contactName}
                </h3>
                <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-tight">
                  Grupo de WhatsApp
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center justify-between">
                  Participantes
                  <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-[9px]">
                    {
                      Object.keys(
                        selectedConversation.metadata?.participants || {}
                      ).length
                    }
                  </span>
                </h4>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
                  {Object.entries(
                    selectedConversation.metadata?.participants || {}
                  ).map(([id, p]: [string, any]) => (
                    <div
                      key={id}
                      className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl border border-transparent hover:border-slate-200 transition-all"
                    >
                      <Avatar className="w-9 h-9 border border-white shadow-sm ring-2 ring-slate-100/50">
                        {p.profilePic && <AvatarImage src={p.profilePic} />}
                        <AvatarFallback className="text-[11px] bg-white text-slate-400 font-bold">
                          {(p.name || "WA").substring(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-700 truncate">
                          {p.name || "Desconhecido"}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium truncate">
                          {id.split("@")[0]}
                        </p>
                        {p.admin && (
                          <span className="inline-flex mt-1 text-[9px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0 rounded-md uppercase tracking-wide">
                            Admin
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-10">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <UserIcon className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-slate-900 font-bold">Contato Desconhecido</h3>
              <p className="text-xs text-slate-500 mt-2 max-w-[200px]">
                Este nÃºmero nÃ£o estÃ¡ salvo nos contatos do sistema.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
};

function UserIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

