import React, { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/@theme/ui/dialog";
import { Badge } from "@/@theme/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/@theme/ui/table";
import { ScrollArea } from "@/@theme/ui/scroll-area";
import {
  ChatCampaign,
  ChatCampaignHistory,
} from "../types/chat-campaign.types";
import chatCampaignService from "../services/chat-campaign.service";
import { format } from "date-fns";
import {
  History,
  Loader2,
  MessageCircle,
  Phone,
  User,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronDown,
} from "lucide-react";
import { Separator } from "@/@theme/ui/separator";
import { Button } from "@/@theme/ui/button";

interface CampaignHistoryModalProps {
  campaign: ChatCampaign | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CampaignHistoryModal: React.FC<CampaignHistoryModalProps> = ({
  campaign,
  open,
  onOpenChange,
}) => {
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [history, setHistory] = useState<ChatCampaignHistory[]>([]);
  const [stats, setStats] = useState({ total: 0, sent: 0, failed: 0 });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 20;

  const loadHistory = useCallback(
    async (isInitial = false) => {
      if (!campaign) return;

      const currentPage = isInitial ? 1 : page;
      if (isInitial) {
        setLoading(true);
        setHistory([]);
      } else {
        setLoadingMore(true);
      }

      try {
        const res = await chatCampaignService.getCampaignHistory(campaign.id, {
          page: currentPage,
          limit: LIMIT,
        });

        if (isInitial) {
          setHistory(res.data);
          setPage(2);
        } else {
          setHistory((prev) => [...prev, ...res.data]);
          setPage((prev) => prev + 1);
        }

        setHasMore(res.data.length === LIMIT);

        if (res.counts) {
          setStats({
            total: res.counts.total || 0,
            sent: res.counts.sent || 0,
            failed: res.counts.failed || 0,
          });
        }
      } catch (error) {
        console.error("Erro ao carregar histÃ³rico", error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [campaign, page]
  );

  useEffect(() => {
    if (open && campaign) {
      setPage(1);
      setHasMore(true);
      loadHistory(true);
    } else {
      setHistory([]);
    }
  }, [open, campaign]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return (
          <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 uppercase text-[10px] font-bold px-2 py-0.5 whitespace-nowrap">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Enviado
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100 uppercase text-[10px] font-bold px-2 py-0.5 whitespace-nowrap">
            <AlertCircle className="w-3 h-3 mr-1" /> Falhou
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 uppercase text-[10px] font-bold px-2 py-0.5 whitespace-nowrap">
            <Clock className="w-3 h-3 mr-1" /> Pendente
          </Badge>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
        <DialogHeader className="p-8 bg-white border-b border-slate-100 shrink-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 shadow-sm border border-orange-100">
                <History className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">
                  HistÃ³rico da Campanha
                </DialogTitle>
                <p className="text-slate-500 font-medium text-xs mt-0.5">
                  {campaign?.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-slate-50 px-4 py-2 rounded-xl flex flex-col items-center border border-slate-100 min-w-[70px]">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Total
                </span>
                <span className="text-base font-black text-slate-900 leading-tight">
                  {stats.total}
                </span>
              </div>
              <div className="bg-blue-50 px-4 py-2 rounded-xl flex flex-col items-center border border-blue-100 min-w-[70px]">
                <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">
                  Sucesso
                </span>
                <span className="text-base font-black text-blue-700 leading-tight">
                  {stats.sent}
                </span>
              </div>
              <div className="bg-red-50 px-4 py-2 rounded-xl flex flex-col items-center border border-red-100 min-w-[70px]">
                <span className="text-[9px] font-black text-red-300 uppercase tracking-widest">
                  Falhas
                </span>
                <span className="text-base font-black text-red-600 leading-tight">
                  {stats.failed}
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 p-8 bg-slate-50/30">
          <div className="space-y-8">
            {/* Template Section */}
            {campaign?.message_template && (
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <MessageCircle className="w-3 h-3" /> Mensagem Inicial
                  Configurada
                </label>
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-5">
                    <MessageCircle className="w-20 h-20 rotate-12" />
                  </div>
                  <p className="text-slate-700 leading-relaxed font-medium italic relative z-10 whitespace-pre-wrap text-sm">
                    {campaign.message_template}
                  </p>
                </div>
              </div>
            )}

            <Separator className="bg-slate-100" />

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <User className="w-3 h-3" /> Log de Envio Individual
              </label>

              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4 bg-white rounded-3xl border border-slate-100">
                  <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
                  <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                    Buscando histÃ³rico...
                  </span>
                </div>
              ) : history.length === 0 ? (
                <div className="py-20 text-center bg-white rounded-3xl border border-slate-100">
                  <p className="text-slate-400 font-medium italic">
                    Nenhum registro de envio encontrado.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                    <Table>
                      <TableHeader className="bg-slate-50/50">
                        <TableRow className="border-b-orange-50">
                          <TableHead className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            DestinatÃ¡rio
                          </TableHead>
                          <TableHead className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            Status
                          </TableHead>
                          <TableHead className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            HorÃ¡rio
                          </TableHead>
                          <TableHead className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            ObservaÃ§Ã£o
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {history.map((record, idx) => (
                          <TableRow
                            key={`${record.id}-${idx}`}
                            className="hover:bg-slate-50/50 transition-colors border-b-slate-50"
                          >
                            <TableCell className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                  <User className="w-3 h-3 text-slate-300" />
                                  {record.name}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                                  <Phone className="w-3 h-3 text-slate-300" />
                                  {record.phone}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="px-6 py-4">
                              {getStatusBadge(record.status)}
                            </TableCell>
                            <TableCell className="px-6 py-4 text-[11px] font-bold text-slate-500 whitespace-nowrap">
                              {record.sent_at ? (
                                format(
                                  new Date(record.sent_at),
                                  "dd/MM - HH:mm:ss"
                                )
                              ) : (
                                <span className="opacity-30">--/--</span>
                              )}
                            </TableCell>
                            <TableCell className="px-6 py-4">
                              {record.status === "failed" ? (
                                <div className="flex items-center gap-2 text-red-500 font-medium text-[10px] bg-red-50 px-2 py-1 rounded-lg border border-red-100 max-w-[200px]">
                                  <AlertCircle className="w-3 h-3 shrink-0" />
                                  <span className="truncate">
                                    {record.error_message || "Erro"}
                                  </span>
                                </div>
                              ) : record.status === "sent" ? (
                                <span className="text-blue-600 font-bold text-[9px] uppercase tracking-wider">
                                  OK
                                </span>
                              ) : (
                                <span className="text-slate-300 italic text-[10px]">
                                  Pendente
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {hasMore && (
                    <div className="flex justify-center pt-4">
                      <Button
                        variant="outline"
                        className="rounded-2xl h-11 px-8 font-black text-[10px] tracking-widest uppercase border-slate-200 hover:bg-white hover:border-orange-600 hover:text-orange-600 transition-all shadow-sm"
                        onClick={() => loadHistory()}
                        disabled={loadingMore}
                      >
                        {loadingMore ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <ChevronDown className="w-4 h-4 mr-2" />
                        )}
                        Ver mais registros
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
          <Button
            variant="ghost"
            className="font-bold text-slate-500 px-8 rounded-xl"
            onClick={() => onOpenChange(false)}
          >
            Fechar Janela
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

