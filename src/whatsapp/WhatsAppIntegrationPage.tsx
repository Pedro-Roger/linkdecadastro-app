import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/@theme/ui/card";
import { Button } from "@/@theme/ui/button";
import { Input } from "@/@theme/ui/input";
import { Badge } from "@/@theme/ui/badge";
import { Switch } from "@/@theme/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/@theme/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/@theme/ui/dialog";
import {
  MessageCircle,
  QrCode,
  Smartphone,
  Send,
  Users,
  Zap,
  Power,
  Search,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Check,
  X,
  Info,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/@theme/ui/tabs";
import { Label } from "@/@theme/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { cn } from "@/shared/lib/utils";
import whatsappService, {
  WhatsAppInstance,
} from "../../services/whatsapp.service";
import { SingleUserSelector } from "@/components/Selectors/UserSelector";

const PAGE_SIZE = 6;
const STATUS_FILTER_OPTIONS = [
  { value: "todos", label: "Todos" },
  { value: "connected", label: "Conectado" },
  { value: "disconnected", label: "Desconectado" },
  { value: "connecting", label: "Aguardando" },
] as const;

const formatLastActivity = (lastSync?: string) => {
  if (!lastSync) return "â€”";
  const date = new Date(lastSync);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Agora mesmo";
  if (diffMins < 60) return `HÃ¡ ${diffMins} minutos`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `HÃ¡ ${diffHours} hora${diffHours > 1 ? "s" : ""}`;
  const diffDays = Math.floor(diffHours / 24);
  return `HÃ¡ ${diffDays} dia${diffDays > 1 ? "s" : ""}`;
};

const WhatsAppIntegrationPage: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [selectedDeviceDetails, setSelectedDeviceDetails] =
    useState<WhatsAppInstance | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "todos" | "connected" | "disconnected" | "connecting"
  >("todos");
  const [page, setPage] = useState(1);
  const [showQR, setShowQR] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connectingChannelId, setConnectingChannelId] = useState<string | null>(
    null
  );
  const [polling, setPolling] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingNameValue, setEditingNameValue] = useState("");
  const [deviceMember, setDeviceMember] = useState<string | null>(null);
  const [isUpdatingMember, setIsUpdatingMember] = useState(false);

  const fetchInstances = useCallback(async () => {
    try {
      const data = await whatsappService.listInstances();
      setInstances(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching instances:", error);
    }
  }, []);

  useEffect(() => {
    fetchInstances();
  }, [fetchInstances]);

  useEffect(() => {
    if (selectedDeviceId) {
      const inst = instances.find((i) => i.id === selectedDeviceId);
      if (inst) {
        setIsEditingName(false);
        setEditingNameValue(inst.name || inst.instanceName);
      }
      if (inst && inst.status === "connected") {
        whatsappService.getStatus(selectedDeviceId).then((status) => {
          setSelectedDeviceDetails({
            ...inst,
            stats: status.stats,
            phoneNumber: status.phoneNumber,
            profileName: status.profileName,
            profilePicUrl: status.profilePicUrl,
            lastSync: status.lastSync,
          });
        });

        whatsappService
          .getChannelMembers(selectedDeviceId)
          .then((members) => {
            if (members && members.length > 0) {
              setDeviceMember(members[0].user_id);
            } else {
              setDeviceMember(null);
            }
          })
          .catch(() => setDeviceMember(null));
      } else {
        setSelectedDeviceDetails(inst || null);
        setDeviceMember(null);
      }
    } else {
      setSelectedDeviceDetails(null);
    }
  }, [selectedDeviceId, instances]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (polling && connectingChannelId) {
      interval = setInterval(async () => {
        try {
          const statusData =
            await whatsappService.getStatus(connectingChannelId);
          setInstances((prev) =>
            prev.map((inst) =>
              inst.id === connectingChannelId
                ? {
                  ...inst,
                  status: statusData.status as WhatsAppInstance["status"],
                  phoneNumber: statusData.phoneNumber,
                  profileName: statusData.profileName,
                  profilePicUrl: statusData.profilePicUrl,
                  stats: statusData.stats,
                  lastSync: statusData.lastSync,
                }
                : inst
            )
          );

          if (statusData.qrCode) {
            setQrCode(statusData.qrCode);
          }

          if (statusData.status === "connected") {
            setShowQR(false);
            setQrCode(null);
            setPolling(false);
            setConnectingChannelId(null);
            toast({
              title: "Conectado!",
              description: "Dispositivo WhatsApp conectado com sucesso.",
              variant: "default",
            });
            fetchInstances();
          }
        } catch (error) {
          console.error("Error checking status:", error);
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [polling, connectingChannelId, toast, fetchInstances]);

  const filteredInstances = useMemo(() => {
    let list = instances;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (i) =>
          (i.name || "").toLowerCase().includes(q) ||
          (i.instanceName || "").toLowerCase().includes(q) ||
          (i.phoneNumber || "").includes(q) ||
          (i.id || "").toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "todos") {
      list = list.filter((i) => i.status === statusFilter);
    }
    return list;
  }, [instances, searchQuery, statusFilter]);

  const totalPages = Math.ceil(filteredInstances.length / PAGE_SIZE);
  const paginatedInstances = useMemo(
    () => filteredInstances.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredInstances, page]
  );

  const handleAddDevice = async () => {
    setLoading(true);
    try {
      const created = await whatsappService.createInstance();
      setInstances((prev) => [created, ...prev]);
      const response = await whatsappService.connectInstance(created.id);
      setQrCode(response.qrCode || null);
      setShowQR(true);
      setPolling(true);
      setConnectingChannelId(created.id);
      toast({
        title: "QR Code gerado",
        description:
          "Escaneie o QR Code com seu WhatsApp para conectar este dispositivo.",
      });
    } catch (error) {
      toast({
        title: "Erro ao adicionar dispositivo",
        description:
          "NÃ£o foi possÃ­vel criar ou gerar o QR Code. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConnectDevice = async (channelId: string) => {
    setLoading(true);
    try {
      const response = await whatsappService.connectInstance(channelId);
      setQrCode(response.qrCode || null);
      setShowQR(true);
      setPolling(true);
      setConnectingChannelId(channelId);
      toast({
        title: "QR Code gerado",
        description: "Escaneie o QR Code com seu WhatsApp.",
      });
    } catch (error) {
      toast({
        title: "Erro ao conectar",
        description: "NÃ£o foi possÃ­vel gerar o QR Code. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (channelId: string) => {
    setLoading(true);
    try {
      await whatsappService.disconnect(channelId);
      setInstances((prev) => prev.filter((i) => i.id !== channelId));
      if (selectedDeviceId === channelId) setSelectedDeviceId(null);
      if (connectingChannelId === channelId) {
        setShowQR(false);
        setQrCode(null);
        setPolling(false);
        setConnectingChannelId(null);
      }
      toast({
        title: "Dispositivo desconectado",
        description: "A instÃ¢ncia foi desconectada com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao desconectar",
        description: "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestMessage = async () => {
    if (!testPhoneNumber) {
      toast({
        title: "NÃºmero obrigatÃ³rio",
        description: "Digite um nÃºmero para testar o envio.",
        variant: "destructive",
      });
      return;
    }
    const connectedChannels = instances.filter((d) => d.status === "connected");
    if (connectedChannels.length === 0) {
      toast({
        title: "Nenhum dispositivo conectado",
        description: "Conecte pelo menos um dispositivo na aba Dispositivos.",
        variant: "destructive",
      });
      return;
    }
    setTestLoading(true);
    try {
      await whatsappService.testMessage(
        testPhoneNumber,
        "OlÃ¡! Este Ã© um teste da integraÃ§Ã£o WhatsApp do Upsprints. Sua conexÃ£o estÃ¡ funcionando corretamente! ðŸš€",
        selectedDeviceId || undefined
      );
      toast({
        title: "Mensagem enviada!",
        description: `O teste foi enviado para ${testPhoneNumber}.`,
      });
    } catch (error) {
      toast({
        title: "Erro no envio",
        description: "NÃ£o foi possÃ­vel enviar a mensagem de teste.",
        variant: "destructive",
      });
    } finally {
      setTestLoading(false);
    }
  };

  const handleUpdateName = async () => {
    if (!selectedDeviceDetails || !editingNameValue.trim()) return;
    try {
      const updated = await whatsappService.updateName(
        selectedDeviceDetails.id,
        editingNameValue
      );
      setInstances((prev) =>
        prev.map((i) =>
          i.id === updated.id ? { ...i, name: updated.name } : i
        )
      );
      setSelectedDeviceDetails((prev) =>
        prev ? { ...prev, name: updated.name } : null
      );
      setIsEditingName(false);
      toast({
        title: "Nome atualizado",
        description: "O nome do dispositivo foi alterado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao atualizar",
        description: "NÃ£o foi possÃ­vel alterar o nome do dispositivo.",
        variant: "destructive",
      });
    }
  };

  const handleToggleNotificationOnly = async (val: boolean) => {
    if (!selectedDeviceDetails) return;
    try {
      const updated = await whatsappService.updateNotificationOnly(
        selectedDeviceDetails.id,
        val
      );
      setInstances((prev) =>
        prev.map((i) =>
          i.id === updated.id ? { ...i, isNotificationOnly: val } : i
        )
      );
      setSelectedDeviceDetails((prev) =>
        prev ? { ...prev, isNotificationOnly: val } : null
      );
      toast({
        title: "ConfiguraÃ§Ã£o atualizada",
        description: `O dispositivo foi definido como ${val ? "apenas para notificaÃ§Ãµes" : "padrÃ£o"
          }.`,
      });
    } catch (error) {
      toast({
        title: "Erro ao atualizar",
        description: "NÃ£o foi possÃ­vel alterar a configuraÃ§Ã£o.",
        variant: "destructive",
      });
    }
  };

  const handleMemberChange = async (userId: string) => {
    if (!selectedDeviceDetails) return;
    setIsUpdatingMember(true);
    try {
      if (deviceMember) {
        await whatsappService.removeChannelMember(
          selectedDeviceDetails.id,
          deviceMember
        );
      }
      await whatsappService.addChannelMember(selectedDeviceDetails.id, userId);
      setDeviceMember(userId);
      toast({
        title: "Vendedor vinculado",
        description:
          "Conversas recebidas por este nÃºmero serÃ£o atribuÃ­das a ele.",
      });
    } catch (error) {
      toast({
        title: "Erro ao vincular",
        description: "NÃ£o foi possÃ­vel vincular o vendedor a este dispositivo.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingMember(false);
    }
  };

  const getStatusBadge = (status: WhatsAppInstance["status"]) => {
    const config: Record<string, { label: string; className: string }> = {
      connected: {
        label: "Conectado",
        className: "bg-blue-100 text-blue-700 border-blue-200",
      },
      disconnected: {
        label: "Desconectado",
        className: "bg-red-100 text-red-700 border-red-200",
      },
      connecting: {
        label: "Aguardando",
        className: "bg-slate-100 text-slate-600 border-slate-200",
      },
    };
    const c = config[status] || config.disconnected;
    return (
      <Badge
        className={cn(
          c.className,
          "border text-xs flex items-center gap-1 w-fit"
        )}
      >
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full",
            status === "connected"
              ? "bg-blue-500"
              : status === "disconnected"
                ? "bg-red-500"
                : "bg-slate-400"
          )}
        />
        {c.label}
      </Badge>
    );
  };

  const getActionLabel = (inst: WhatsAppInstance) => {
    if (inst.status === "connected") return "Gerenciar";
    if (inst.status === "disconnected") return "Reconectar";
    return "Configurar";
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-blue-600" />
            IntegraÃ§Ã£o WhatsApp
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Gerencie seus dispositivos WhatsApp. Cada dispositivo tem seu
            prÃ³prio nÃºmero e conversas.
          </p>
        </div>
        <Button
          onClick={handleAddDevice}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 gap-2"
        >
          <Smartphone className="w-4 h-4" />
          Adicionar dispositivo
        </Button>
      </div>

      <Tabs defaultValue="devices" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="devices">
            <Smartphone className="w-4 h-4 mr-2" />
            Dispositivos
          </TabsTrigger>
          <TabsTrigger value="bulk-send">
            <Send className="w-4 h-4 mr-2" />
            Envio em Massa
          </TabsTrigger>
        </TabsList>

        <TabsContent value="devices" className="space-y-6">
          <div className="flex flex-col xl:flex-row gap-6">
            {/* Painel esquerdo - Lista de dispositivos */}
            <Card className="xl:w-[58%] flex-1">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Buscar dispositivo ou nÃºmero..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value as typeof statusFilter);
                      setPage(1);
                    }}
                    className="h-10 px-3 rounded-md border border-slate-200 bg-white text-sm"
                  >
                    {STATUS_FILTER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-100">
                      <TableHead className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
                        Status
                      </TableHead>
                      <TableHead className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
                        Nome do dispositivo
                      </TableHead>
                      <TableHead className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
                        NÃºmero
                      </TableHead>
                      <TableHead className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
                        Ãšltima atividade
                      </TableHead>
                      <TableHead className="text-[10px] uppercase tracking-widest font-bold text-slate-400 text-right">
                        AÃ§Ãµes
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedInstances.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center py-12 text-slate-500"
                        >
                          Nenhum dispositivo encontrado. Adicione um dispositivo
                          para comeÃ§ar.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedInstances.map((inst) => (
                        <TableRow
                          key={inst.id}
                          className={cn(
                            "cursor-pointer hover:bg-slate-50/50",
                            selectedDeviceId === inst.id && "bg-orange-50/50"
                          )}
                          onClick={() => setSelectedDeviceId(inst.id)}
                        >
                          <TableCell>{getStatusBadge(inst.status)}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-slate-900">
                                {inst.name || inst.instanceName}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {inst.status === "connected"
                              ? inst.phoneNumber || "â€”"
                              : inst.status === "connecting"
                                ? "Pendente"
                                : "â€”"}
                          </TableCell>
                          <TableCell className="text-slate-500 text-sm">
                            {formatLastActivity(inst.lastSync)}
                          </TableCell>
                          <TableCell className="text-right">
                            {inst.status === "connected" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDeviceId(inst.id);
                                }}
                              >
                                Gerenciar
                              </Button>
                            ) : inst.status === "disconnected" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleConnectDevice(inst.id);
                                }}
                                disabled={loading}
                              >
                                Reconectar
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleConnectDevice(inst.id);
                                }}
                                disabled={
                                  loading ||
                                  (!!connectingChannelId &&
                                    connectingChannelId !== inst.id)
                                }
                              >
                                Configurar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                {filteredInstances.length > 0 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                    <p className="text-xs text-slate-500">
                      Mostrando{" "}
                      {Math.min(
                        (page - 1) * PAGE_SIZE + 1,
                        filteredInstances.length
                      )}{" "}
                      a {Math.min(page * PAGE_SIZE, filteredInstances.length)}{" "}
                      de {filteredInstances.length} dispositivos
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="text-xs font-medium text-slate-600">
                        PÃ¡gina {page} de {Math.max(1, totalPages)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          setPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={page >= totalPages}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Painel direito - VisÃ£o RÃ¡pida */}
            <Card className="xl:w-[42%] min-w-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold">
                  VisÃ£o RÃ¡pida
                </CardTitle>
                <CardDescription>
                  Detalhes e mÃ©tricas do dispositivo selecionado
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {selectedDeviceDetails ? (
                  <>
                    <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-slate-100 bg-slate-100 flex items-center justify-center shrink-0">
                        {selectedDeviceDetails.status === "connected" &&
                          selectedDeviceDetails.profilePicUrl ? (
                          <img
                            src={selectedDeviceDetails.profilePicUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Smartphone className="w-6 h-6 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        {isEditingName ? (
                          <div className="flex items-center gap-2 mb-1">
                            <Input
                              value={editingNameValue}
                              onChange={(e) =>
                                setEditingNameValue(e.target.value)
                              }
                              className="h-8 w-40 text-sm"
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={handleUpdateName}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                              onClick={() => {
                                setIsEditingName(false);
                                setEditingNameValue(
                                  selectedDeviceDetails.name ||
                                  selectedDeviceDetails.instanceName
                                );
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-900">
                              {selectedDeviceDetails.name ||
                                selectedDeviceDetails.instanceName}
                            </p>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-slate-400 hover:text-slate-600"
                              onClick={() => {
                                setEditingNameValue(
                                  selectedDeviceDetails.name ||
                                  selectedDeviceDetails.instanceName
                                );
                                setIsEditingName(true);
                              }}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                        <p className="text-sm text-slate-600">
                          {selectedDeviceDetails.status === "connected"
                            ? selectedDeviceDetails.phoneNumber || "â€”"
                            : "Pendente"}
                        </p>
                        <Badge className="mt-1 text-[9px] bg-orange-100 text-orange-700 border-0">
                          SELECIONADO
                        </Badge>
                        <div className="flex items-center gap-2 mt-2">
                          <Switch
                            id="notif-only"
                            checked={!!selectedDeviceDetails.isNotificationOnly}
                            onCheckedChange={handleToggleNotificationOnly}
                            className="scale-75 origin-left"
                          />
                          <Label
                            htmlFor="notif-only"
                            className="text-xs text-slate-600 cursor-pointer"
                          >
                            Apenas NotificaÃ§Ãµes (Usado para enviar notificaÃ§Ãµes
                            para o WhatsApp)
                          </Label>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-100">
                          <Label className="text-xs text-slate-800 font-bold mb-1.5 block">
                            Vendedor ResponsÃ¡vel
                          </Label>
                          <SingleUserSelector
                            selectedUser={deviceMember || ""}
                            onUserChange={handleMemberChange}
                            placeholder="Selecione um vendedor..."
                            className="w-full text-xs border border-slate-200"
                            disabled={
                              isUpdatingMember ||
                              selectedDeviceDetails.status !== "connected"
                            }
                          />
                          <p className="text-[10px] text-slate-500 mt-1">
                            Novas conversas neste nÃºmero serÃ£o atribuÃ­das
                            automaticamente a este usuÃ¡rio.
                          </p>
                        </div>
                      </div>
                    </div>

                    {selectedDeviceDetails.status === "connected" && (
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-4 rounded-xl bg-orange-50 border border-orange-100 flex flex-col items-center">
                          <MessageCircle className="w-5 h-5 text-orange-600 mb-2" />
                          <span className="text-xl font-bold text-orange-900">
                            {selectedDeviceDetails.stats?.messages?.toLocaleString() ||
                              0}
                          </span>
                          <span className="text-[10px] font-medium text-orange-500 mt-0.5">
                            Mensagens
                          </span>
                        </div>
                        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex flex-col items-center">
                          <Users className="w-5 h-5 text-emerald-600 mb-2" />
                          <span className="text-xl font-bold text-emerald-900">
                            {selectedDeviceDetails.stats?.contacts?.toLocaleString() ||
                              0}
                          </span>
                          <span className="text-[10px] font-medium text-emerald-500 mt-0.5">
                            Contatos
                          </span>
                        </div>
                        <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 flex flex-col items-center">
                          <Zap className="w-5 h-5 text-amber-600 mb-2" />
                          <span className="text-xl font-bold text-amber-900">
                            {selectedDeviceDetails.stats?.chats?.toLocaleString() ||
                              0}
                          </span>
                          <span className="text-[10px] font-medium text-amber-500 mt-0.5">
                            Conversas
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      {selectedDeviceDetails.status === "connected" && (
                        <Button
                          variant="destructive"
                          className="w-full gap-2"
                          onClick={() =>
                            handleDisconnect(selectedDeviceDetails.id)
                          }
                          disabled={loading}
                        >
                          <Power className="w-4 h-4" />
                          Desconectar Dispositivo
                        </Button>
                      )}
                    </div>

                    {selectedDeviceDetails.status === "connected" && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        <p className="text-xs text-blue-800 font-medium">
                          Status da instÃ¢ncia: Conectado
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Smartphone className="w-16 h-16 text-slate-200 mb-4" />
                    <p className="text-sm font-medium text-slate-600">
                      Nenhum dispositivo selecionado
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Clique em um dispositivo na lista para ver os detalhes e
                      mÃ©tricas
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Modal QR Code */}
          <Dialog
            open={showQR}
            onOpenChange={(open) =>
              !open &&
              (setShowQR(false),
                setQrCode(null),
                setPolling(false),
                setConnectingChannelId(null))
            }
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Conectar dispositivo</DialogTitle>
                <DialogDescription>
                  Escaneie o QR Code com o WhatsApp que deseja vincular a este
                  dispositivo.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center py-6">
                <div className="w-64 h-64 bg-slate-100 rounded-lg flex items-center justify-center mb-4 overflow-hidden">
                  {qrCode ? (
                    <img
                      src={qrCode}
                      alt="QR Code WhatsApp"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <QrCode className="w-32 h-32 text-slate-400 animate-pulse" />
                  )}
                </div>
                <p className="text-sm font-medium text-slate-700">
                  Escaneie este QR Code com seu WhatsApp
                </p>
                <p className="text-xs text-slate-500 text-center mt-2">
                  Abra o WhatsApp â†’ ConfiguraÃ§Ãµes â†’ Aparelhos conectados â†’
                  Conectar um aparelho
                </p>
              </div>
            </DialogContent>
          </Dialog>

          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200/50 space-y-3">
            <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm">
              <Info className="w-4 h-4" />
              Regras e RecomendaÃ§Ãµes de ConexÃ£o (Evite Quedas)
            </div>
            <ul className="text-sm text-amber-700/90 space-y-2 list-disc pl-4">
              <li>
                <strong className="text-amber-800">WhatsApp Business:</strong> Ã‰
                extremamente recomendado que o nÃºmero conectado utilize o
                aplicativo WhatsApp Business, pois as contas pessoais tÃªm regras
                de bloqueio mais agressivas.
              </li>
              <li>
                <strong className="text-amber-800">Regra dos 14 dias:</strong>{" "}
                Se o seu nÃºmero principal (aparelho celular) nÃ£o abrir o
                WhatsApp por mais de 14 dias ou ficar sem internet, o WhatsApp
                Web (e consequentemente esta API) serÃ¡ desconectado
                automaticamente por seguranÃ§a da Meta.
              </li>
              <li>
                <strong className="text-amber-800">
                  Bloqueios ou Comportamento Suspeito:
                </strong>{" "}
                Envio em massa de campanhas sem "aquecimento" prÃ©vio do nÃºmero
                ou mÃºltiplos registros de pessoas reportando o nÃºmero como spam
                resultarÃ£o em desconexÃµes forÃ§adas e risco de banimento da
                conta.
              </li>
            </ul>
          </div>
        </TabsContent>

        <TabsContent value="bulk-send" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5 text-orange-600" />
                Validar ConexÃ£o
              </CardTitle>
              <CardDescription>
                Selecione um dispositivo conectado na aba Dispositivos e envie
                uma mensagem de teste.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="test-phone">NÃºmero de Telefone</Label>
                <div className="flex gap-2">
                  <Input
                    id="test-phone"
                    placeholder="Ex: 5592999999999"
                    value={testPhoneNumber}
                    onChange={(e) => setTestPhoneNumber(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={handleTestMessage}
                    disabled={
                      testLoading ||
                      instances.filter((d) => d.status === "connected")
                        .length === 0
                    }
                    className="gap-2"
                  >
                    {testLoading ? "Enviando..." : "Enviar Teste"}
                  </Button>
                </div>
                <p className="text-[10px] text-slate-400">
                  Use o formato DDI + DDD + NÃºmero (ex: 5592999999999)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WhatsAppIntegrationPage;

