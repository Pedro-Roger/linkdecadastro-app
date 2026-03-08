import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  Plus,
  Search,
  MessageSquare,
  History,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  Filter,
} from "lucide-react";
import { Button } from "@/@theme/ui/button";
import { Input } from "@/@theme/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/@theme/ui/table";
import { Badge } from "@/@theme/ui/badge";
import { Card, CardContent } from "@/@theme/ui/card";
import { Progress } from "@/@theme/ui/progress";
import chatCampaignService from "../services/chat-campaign.service";
import { ChatCampaign } from "../types/chat-campaign.types";
import { CampaignHistoryModal } from "../components/CampaignHistoryModal";
import whatsappService, {
  WhatsAppInstance,
} from "@/modules/organization/services/whatsapp.service";

const CampaignListPage: React.FC = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<ChatCampaign[]>([]);
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState<ChatCampaign | null>(
    null
  );
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [campaignList, instanceList] = await Promise.all([
        chatCampaignService.listCampaigns(),
        whatsappService.getInstances(),
      ]);
      setCampaigns(campaignList);
      setInstances(instanceList);
    } catch (error) {
      console.error("Erro ao carregar dados", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCampaigns = campaigns.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-blue-100 text-blue-700 border-none hover:bg-blue-100 flex items-center gap-1 w-fit">
            <CheckCircle2 className="w-3 h-3" /> ConcluÃ­da
          </Badge>
        );
      case "processing":
        return (
          <Badge className="bg-blue-100 text-blue-700 border-none hover:bg-blue-100 flex items-center gap-1 w-fit">
            <Loader2 className="w-3 h-3 animate-spin" /> Processando
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-100 text-red-700 border-none hover:bg-red-100 flex items-center gap-1 w-fit">
            <AlertCircle className="w-3 h-3" /> Falhou
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-100 text-slate-700 border-none hover:bg-slate-100 flex items-center gap-1 w-fit">
            <Clock className="w-3 h-3" /> Pendente
          </Badge>
        );
    }
  };

  const handleViewHistory = (campaign: ChatCampaign) => {
    setSelectedCampaign(campaign);
    setIsHistoryModalOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Campanhas de Mensagens
          </h1>
          <p className="text-slate-500 text-sm">
            Gerencie e acompanhe o disparo de mensagens para seus contatos.
          </p>
        </div>
        <Button
          onClick={() => navigate("/campaigns/nova")}
          className="bg-orange-600 hover:bg-orange-700 text-white shadow-md transition-all active:scale-95 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nova Campanha
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-orange-50 to-white border-orange-100 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-orange-600 font-semibold text-sm">
                Total de Campanhas
              </span>
              <MessageSquare className="w-4 h-4 text-orange-400" />
            </div>
            <div className="text-3xl font-bold text-slate-900">
              {campaigns.length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-blue-600 font-semibold text-sm">
                Mensagens Enviadas
              </span>
              <CheckCircle2 className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-3xl font-bold text-slate-900">
              {campaigns.reduce((acc, c) => acc + c.sent_count, 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-white border-orange-100 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-orange-600 font-semibold text-sm">
                Progresso MÃ©dio
              </span>
              <Clock className="w-4 h-4 text-orange-400" />
            </div>
            <div className="text-3xl font-bold text-slate-900">
              {campaigns.length > 0
                ? Math.round(
                    (campaigns.reduce(
                      (acc, c) => acc + (c.sent_count / c.total_contacts || 0),
                      0
                    ) /
                      campaigns.length) *
                      100
                  )
                : 0}
              %
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-50 flex flex-col sm:flex-row gap-4 justify-between bg-slate-50/50">
          <div className="relative flex-1 max-w-sm group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
            <Input
              placeholder="Buscar campanhas..."
              className="pl-10 h-10 bg-white border-slate-200 focus-visible:ring-orange-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="p-10 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            <span className="text-slate-500 font-medium">
              Carregando campanhas...
            </span>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow>
                <TableHead className="font-bold text-slate-700">Nome</TableHead>
                <TableHead className="font-bold text-slate-700">
                  Canal
                </TableHead>
                <TableHead className="font-bold text-slate-700">
                  Status
                </TableHead>
                <TableHead className="font-bold text-slate-700">
                  Progresso
                </TableHead>
                <TableHead className="font-bold text-slate-700">
                  Data de CriaÃ§Ã£o
                </TableHead>
                <TableHead className="text-right font-bold text-slate-700">
                  AÃ§Ãµes
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCampaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center">
                        <MessageSquare className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-slate-500 font-medium">
                        Nenhuma campanha encontrada
                      </p>
                      <Button
                        variant="link"
                        onClick={() => navigate("/campaigns/nova")}
                        className="text-orange-600"
                      >
                        Criar minha primeira campanha
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCampaigns.map((campaign) => {
                  const progress =
                    Math.round(
                      (campaign.sent_count / campaign.total_contacts) * 100
                    ) || 0;
                  const instance = instances.find(
                    (i) => i.id === campaign.channel_id
                  );

                  return (
                    <TableRow
                      key={campaign.id}
                      className="group hover:bg-slate-50/50 transition-colors"
                    >
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">
                            {campaign.name}
                          </span>
                          <span className="text-xs text-slate-500 truncate max-w-[200px]">
                            {campaign.message_template}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-blue-500" />
                          <span className="text-sm text-slate-600">
                            {instance
                              ? instance.name || instance.instanceName
                              : campaign.channel_id}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 w-32">
                          <div className="flex justify-between text-[10px] font-bold text-slate-500">
                            <span>
                              {campaign.sent_count} / {campaign.total_contacts}
                            </span>
                            <span>{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-1.5" />
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600 text-sm">
                        {format(
                          new Date(campaign.created_at),
                          "dd/MM/yyyy HH:mm"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 gap-2"
                          onClick={() => handleViewHistory(campaign)}
                        >
                          <History className="w-4 h-4" /> Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <CampaignHistoryModal
        open={isHistoryModalOpen}
        onOpenChange={setIsHistoryModalOpen}
        campaign={selectedCampaign}
      />
    </div>
  );
};

export default CampaignListPage;

