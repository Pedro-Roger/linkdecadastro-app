import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  Plus,
  Search,
  MessageSquare,
  Users,
  CheckCircle2,
  Trash2,
  Loader2,
  ChevronLeft,
  ArrowRight,
  Send,
  UserPlus,
  Smartphone,
  Info,
  Layers,
  FileText,
  UserCheck,
  Eye,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/@theme/ui/button";
import { Input } from "@/@theme/ui/input";
import { Label } from "@/@theme/ui/label";
import { Textarea } from "@/@theme/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/@theme/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/@theme/ui/card";
import { Badge } from "@/@theme/ui/badge";
import { Separator } from "@/@theme/ui/separator";
import { useToast } from "@/@theme/ui/use-toast";
import chatCampaignService from "../services/chat-campaign.service";
import whatsappService, {
  WhatsAppInstance,
} from "@/modules/organization/services/whatsapp.service";
import { clientsService } from "@/modules/clients/services/clients.service";
import { IClientSimples } from "@/modules/clients/dto/client.dto";

const CampaignCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const clientSrv = clientsService();

  const [loading, setLoading] = useState(false);
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [loadingInstances, setLoadingInstances] = useState(true);

  // Form State
  const [name, setName] = useState("");
  const [messageTemplate, setMessageTemplate] = useState("");
  const [channelId, setChannelId] = useState("");

  // Contacts state
  const [contactInput, setContactInput] = useState("");
  const [contacts, setContacts] = useState<{ name: string; phone: string }[]>(
    []
  );

  // Clients selection state
  const [searchQuery, setSearchQuery] = useState("");
  const [foundClients, setFoundClients] = useState<IClientSimples[]>([]);
  const [isSearchingClients, setIsSearchingClients] = useState(false);
  const [allClientsSelected, setAllClientsSelected] = useState(false);

  // Pagination for contacts table
  const [currentPage, setCurrentPage] = useState(1);
  const contactsPerPage = 20;

  const totalPages = Math.ceil(contacts.length / contactsPerPage);
  const visibleContacts = React.useMemo(() => {
    const start = (currentPage - 1) * contactsPerPage;
    return contacts.slice(start, start + contactsPerPage);
  }, [contacts, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [contacts.length, totalPages]);

  useEffect(() => {
    loadInstances();
  }, []);

  useEffect(() => {
    if (searchQuery.length > 2) {
      const timer = setTimeout(() => {
        handleSearchClients();
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setFoundClients([]);
    }
  }, [searchQuery]);

  const loadInstances = async () => {
    setLoadingInstances(true);
    try {
      const data = await whatsappService.getInstances();
      setInstances(data);
    } catch (error) {
      console.error("Error loading instances", error);
    } finally {
      setLoadingInstances(false);
    }
  };

  const handleSearchClients = async () => {
    setIsSearchingClients(true);
    try {
      const response = await clientSrv.findAllClientsSimples(
        1,
        10,
        searchQuery
      );
      setFoundClients(response.data);
    } catch (error) {
      console.error("Error searching clients:", error);
    } finally {
      setIsSearchingClients(false);
    }
  };

  const handleAddClient = (client: IClientSimples) => {
    const phone = client.celular || client.telefone;
    if (!phone) {
      toast({
        title: "Aviso",
        description: "Este cliente nÃ£o possui telefone cadastrado.",
        variant: "warning",
      });
      return;
    }

    const alreadyExists = contacts.some((c) => c.phone === phone);
    if (alreadyExists) {
      toast({
        title: "Aviso",
        description: "Contato jÃ¡ adicionado.",
      });
      return;
    }

    setContacts((prev) => [
      ...prev,
      { name: client.nome_fantasia || client.razao_social, phone },
    ]);
    setSearchQuery("");
    setFoundClients([]);
    setAllClientsSelected(false);
  };

  const handleSelectAllClients = async () => {
    setLoading(true);
    try {
      let page = 1;
      const limit = 500; // Batch size
      let allNewContacts: { name: string; phone: string }[] = [];
      let hasMore = true;

      while (hasMore) {
        const response = await clientSrv.findAllClientsSimples(page, limit);
        const batch = response.data
          .filter((c) => c.celular || c.telefone)
          .map((c) => ({
            name: c.nome_fantasia || c.razao_social,
            phone: (c.celular || c.telefone) as string,
          }));

        allNewContacts = [...allNewContacts, ...batch];

        // Verifica se ainda tem pÃ¡ginas para buscar
        if (page >= response.totalPage || response.data.length < limit) {
          hasMore = false;
        } else {
          page++;
        }
      }

      setContacts((prev) => {
        const existingPhones = new Set(prev.map((p) => p.phone));
        const uniqueNew = allNewContacts.filter(
          (c) => !existingPhones.has(c.phone)
        );
        return [...prev, ...uniqueNew];
      });

      setAllClientsSelected(true);
      toast({
        title: "ImportaÃ§Ã£o ConcluÃ­da",
        description: `${allNewContacts.length} contatos foram processados e adicionados.`,
      });
    } catch (error) {
      toast({
        title: "Erro na ImportaÃ§Ã£o",
        description:
          "Ocorreu uma falha ao tentar buscar todos os clientes da base.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddManualContacts = () => {
    if (!contactInput.trim()) return;

    const lines = contactInput.split("\n");
    const newContacts: { name: string; phone: string }[] = [];

    lines.forEach((line) => {
      const parts = line.split(",").map((p) => p.trim());
      if (parts.length >= 2) {
        newContacts.push({ name: parts[0], phone: parts[1] });
      } else if (parts[0] && /^\d+$/.test(parts[0].replace(/\D/g, ""))) {
        newContacts.push({ name: "Cliente", phone: parts[0] });
      }
    });

    if (newContacts.length === 0) {
      toast({
        title: "Erro",
        description:
          "Formato invÃ¡lido. Use 'Nome, Telefone' ou apenas o telefone por linha.",
        variant: "destructive",
      });
      return;
    }

    setContacts((prev) => {
      const existingPhones = new Set(prev.map((p) => p.phone));
      const uniqueNew = newContacts.filter((c) => !existingPhones.has(c.phone));
      return [...prev, ...uniqueNew];
    });
    setContactInput("");
    setAllClientsSelected(false);
    toast({
      title: "Contatos Adicionados",
      description: `${newContacts.length} contatos adicionados manualmente.`,
    });
  };

  const removeContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index));
    setAllClientsSelected(false);
  };

  const getPreviewMessage = () => {
    if (!messageTemplate) return "Sua mensagem aparecerÃ¡ aqui...";
    const firstContactName = contacts.length > 0 ? contacts[0].name : "Cliente";
    return messageTemplate
      .replace(/{{nome}}/gi, firstContactName)
      .replace(/{{name}}/gi, firstContactName)
      .replace(/{nome}/gi, firstContactName)
      .replace(/{name}/gi, firstContactName);
  };

  const handleCreate = async () => {
    if (!name || !messageTemplate || !channelId || contacts.length === 0) {
      toast({
        title: "Erro",
        description:
          "Preencha todos os campos obrigatÃ³rios e adicione pelo menos um contato.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await chatCampaignService.createCampaign({
        name,
        message_template: messageTemplate,
        channel_id: channelId,
        contacts,
      });

      toast({
        title: "Sucesso",
        description: "Campanha criada e iniciada com sucesso!",
      });

      navigate("/campaigns");
    } catch (error) {
      toast({
        title: "Erro",
        description: "NÃ£o foi possÃ­vel criar a campanha.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm mb-8">
        <div className="flex items-center gap-6">
          <div className="h-14 w-14 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 shadow-inner">
            <MessageSquare className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Button
                variant="link"
                onClick={() => navigate("/campaigns")}
                className="p-0 h-auto text-slate-400 hover:text-orange-600"
              >
                Campanhas
              </Button>
              <ChevronLeft className="w-4 h-4 text-slate-300 rotate-180" />
              <span className="text-slate-900 font-bold">Criar Nova</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter">
              LanÃ§amento de Campanha
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => navigate("/campaigns")}
            className="font-bold text-slate-500 rounded-xl px-6 h-12"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCreate}
            disabled={loading}
            className="bg-orange-600 hover:bg-orange-700 text-white shadow-xl shadow-orange-100 px-10 h-12 rounded-xl font-bold transition-all active:scale-95"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 mr-3 animate-spin" />
            ) : (
              <Send className="w-5 h-5 mr-3" />
            )}
            ATIVAR DISPAROS
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Main Configuration Section */}
        <div className="xl:col-span-8 space-y-8">
          {/* Card 1: Setup & Message */}
          <Card className="border-none shadow-2xl shadow-slate-200/50 rounded-3xl overflow-hidden ring-1 ring-slate-100">
            <CardHeader className="bg-slate-50/80 border-b border-slate-100 py-8 px-10">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-black text-slate-900 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-orange-600 flex items-center justify-center shadow-lg shadow-orange-200">
                      <Info className="w-5 h-5 text-white" />
                    </div>
                    ConteÃºdo e Canal
                  </CardTitle>
                  <CardDescription className="text-slate-500 mt-2">
                    Defina o que serÃ¡ enviado e por qual canal.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-10 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-3">
                  <Label
                    htmlFor="campaign-name"
                    className="text-sm font-bold text-slate-700"
                  >
                    IdentificaÃ§Ã£o da Campanha
                  </Label>
                  <Input
                    id="campaign-name"
                    placeholder="Ex: Ofertas de Final de Semana"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-14 rounded-2xl border-slate-200 focus:ring-4 focus:ring-orange-50 focus:border-orange-500 text-lg font-medium px-6 transition-all"
                  />
                </div>

                <div className="space-y-3">
                  <Label
                    htmlFor="whatsapp-channel"
                    className="text-sm font-bold text-slate-700"
                  >
                    Canal de WhatsApp
                  </Label>
                  <Select value={channelId} onValueChange={setChannelId}>
                    <SelectTrigger
                      id="whatsapp-channel"
                      className="h-14 rounded-2xl border-slate-200 focus:ring-4 focus:ring-orange-50 focus:border-orange-500 px-6"
                    >
                      <SelectValue placeholder="Selecione o canal emissor" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl shadow-2xl p-2 border-slate-100">
                      {loadingInstances ? (
                        <div className="p-4 flex items-center gap-3 text-sm text-slate-500 italic">
                          <Loader2 className="w-5 h-5 animate-spin text-orange-500" />{" "}
                          Carregando canais disponÃ­veis...
                        </div>
                      ) : (
                        instances.map((instance) => (
                          <SelectItem
                            key={instance.id}
                            value={instance.id}
                            className="rounded-xl py-3 cursor-pointer"
                          >
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                                <Smartphone className="w-5 h-5" />
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-800 leading-tight">
                                  {instance.name || instance.instanceName}
                                </span>
                                <span className="text-xs text-slate-500 font-medium">
                                  {instance.phoneNumber}
                                </span>
                              </div>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator className="bg-slate-100" />

              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <Label
                    htmlFor="campaign-message"
                    className="text-lg font-black text-slate-900 tracking-tight"
                  >
                    ComposiÃ§Ã£o da Mensagem
                  </Label>
                  <div className="flex gap-2">
                    <Badge
                      variant="secondary"
                      className="bg-orange-600 text-white hover:bg-orange-700 px-3 py-1 font-bold rounded-lg border-none"
                    >
                      VariÃ¡veis: {"{{nome}}"} ou {"{{name}}"}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <Textarea
                      id="campaign-message"
                      placeholder="OlÃ¡ {{nome}}, tudo bem?"
                      className="min-h-[300px] text-lg rounded-3xl resize-none focus:ring-4 focus:ring-orange-50 focus:border-orange-500 p-8 leading-relaxed shadow-inner bg-slate-50/30 border-slate-200"
                      value={messageTemplate}
                      onChange={(e) => setMessageTemplate(e.target.value)}
                    />
                    <div className="flex items-start gap-4 bg-amber-50 rounded-2xl p-5 border border-amber-100">
                      <AlertCircle className="w-6 h-6 text-amber-500 shrink-0 mt-1" />
                      <p className="text-xs text-amber-800 font-medium leading-relaxed">
                        <strong>Evite spam:</strong> Recomendamos nÃ£o enviar
                        links externos em massa se o seu nÃºmero for novo.
                        Procure manter uma cadÃªncia humana nos disparos.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                      VisualizaÃ§Ã£o em Tempo Real
                    </Label>
                    <div className="bg-slate-100 rounded-[2.5rem] p-6 h-[300px] border-4 border-slate-200 relative overflow-hidden shadow-2xl">
                      <div className="bg-[#e5ddd5] absolute inset-0 opacity-40"></div>
                      <div className="relative z-10 space-y-4 flex flex-col items-start pt-4 h-full overflow-y-auto pr-2 scrollbar-hide">
                        <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-md max-w-[85%] animate-in fade-in slide-in-from-left-4 duration-500">
                          <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed italic">
                            {getPreviewMessage()}
                          </p>
                          <span className="text-[10px] text-slate-400 mt-2 block text-right font-medium">
                            10:42 AM
                          </span>
                        </div>
                        <div className="text-center w-full py-4 text-[10px] font-bold text-slate-500/50 uppercase tracking-widest">
                          PrÃ©via do WhatsApp
                        </div>
                      </div>
                    </div>
                    <div className="bg-orange-50/50 rounded-2xl p-5 border border-orange-100">
                      <div className="flex items-center gap-3 mb-2">
                        <Eye className="w-4 h-4 text-orange-600" />
                        <span className="text-xs font-bold text-orange-900">
                          Como funciona o Nome?
                        </span>
                      </div>
                      <p className="text-[11px] text-orange-700 leading-normal">
                        Ao usar <code>{"{{nome}}"}</code>, o sistema substituirÃ¡
                        automaticamente pelo nome real do cliente na sua lista.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: THE BIG RECIPIENTS TABLE */}
          <Card
            id="recipients-card"
            className="border-none shadow-2xl shadow-slate-200/50 rounded-3xl overflow-hidden ring-1 ring-slate-100"
          >
            <CardHeader className="bg-white border-b border-slate-100 py-10 px-10">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                  <CardTitle className="text-2xl font-black text-slate-900 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-orange-600 flex items-center justify-center shadow-xl shadow-orange-100">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    Lista de DestinatÃ¡rios
                  </CardTitle>
                  <CardDescription className="ml-16 mt-1 text-slate-500 font-medium">
                    Gerencie todos os nÃºmeros que receberÃ£o esta campanha.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-4 ml-16 lg:ml-0">
                  <div className="bg-orange-50 px-6 py-3 rounded-2xl flex items-center gap-3 border border-orange-100">
                    <span className="text-orange-600 font-black text-2xl">
                      {contacts.length}
                    </span>
                    <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest leading-none">
                      Total
                      <br />
                      Registros
                    </span>
                  </div>
                  {contacts.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 font-bold h-12 px-6 rounded-xl border-slate-200"
                      onClick={() => setContacts([])}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Limpar Lista
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {contacts.length === 0 ? (
                <div className="py-32 flex flex-col items-center justify-center text-center space-y-6">
                  <div className="h-28 w-28 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 shadow-inner">
                    <Layers className="w-14 h-14" />
                  </div>
                  <div className="max-w-sm px-6">
                    <h3 className="text-xl font-black text-slate-800 mb-2">
                      Sua lista estÃ¡ vazia
                    </h3>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">
                      Utilize o painel lateral para buscar clientes na sua base
                      ou adicione contatos manualmente para comeÃ§ar.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto min-h-[400px]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-24">
                          PosiÃ§Ã£o
                        </th>
                        <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                          Nome do DestinatÃ¡rio
                        </th>
                        <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                          WhatsApp
                        </th>
                        <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-32 text-center">
                          Remover
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {visibleContacts.map((contact, idx) => {
                        const actualIdx =
                          (currentPage - 1) * contactsPerPage + idx;
                        return (
                          <tr
                            key={actualIdx}
                            className="hover:bg-orange-50/20 transition-all group"
                          >
                            <td className="px-10 py-6">
                              <span className="text-sm font-black text-slate-300 group-hover:text-orange-300">
                                {(actualIdx + 1).toString().padStart(3, "0")}
                              </span>
                            </td>
                            <td className="px-10 py-6">
                              <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-sm text-slate-500 shadow-inner border-2 border-white group-hover:bg-white group-hover:text-orange-600 group-hover:border-orange-100 transition-all">
                                  {contact.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-800 text-lg tracking-tight group-hover:text-orange-900">
                                    {contact.name}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                    Membro Verificado
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-10 py-6">
                              <div className="flex items-center gap-3 text-base font-bold text-slate-600 bg-slate-50 rounded-xl px-4 py-2 w-fit group-hover:bg-white group-hover:shadow-sm transition-all font-mono">
                                <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
                                {contact.phone}
                              </div>
                            </td>
                            <td className="px-10 py-6 text-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-11 w-11 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                onClick={() => removeContact(actualIdx)}
                              >
                                <Trash2 className="w-5 h-5" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {contacts.length > 0 && (
                <div className="bg-slate-50 p-8 border-t border-slate-100 rounded-b-3xl">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                    <p className="text-sm text-slate-500 font-bold italic order-2 sm:order-1">
                      Mostrando{" "}
                      <span className="text-slate-900">
                        {visibleContacts.length}
                      </span>{" "}
                      de{" "}
                      <span className="text-slate-900">{contacts.length}</span>{" "}
                      contatos.
                    </p>

                    {totalPages > 1 && (
                      <div className="flex items-center gap-2 order-1 sm:order-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCurrentPage((prev) => Math.max(1, prev - 1));
                            const el =
                              document.getElementById("recipients-card");
                            el?.scrollIntoView({ behavior: "smooth" });
                          }}
                          disabled={currentPage === 1}
                          className="rounded-xl border-slate-200 h-10 w-10 p-0 bg-white"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>

                        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-4 h-10 shadow-sm">
                          <span className="text-xs font-black text-slate-900">
                            {currentPage}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                            de
                          </span>
                          <span className="text-xs font-black text-slate-900">
                            {totalPages}
                          </span>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCurrentPage((prev) =>
                              Math.min(totalPages, prev + 1)
                            );
                            const el =
                              document.getElementById("recipients-card");
                            el?.scrollIntoView({ behavior: "smooth" });
                          }}
                          disabled={currentPage === totalPages}
                          className="rounded-xl border-slate-200 h-10 w-10 p-0 bg-white"
                        >
                          <ChevronLeft className="w-4 h-4 rotate-180" />
                        </Button>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      className="rounded-xl font-bold text-xs h-10 border-slate-200 bg-white order-3"
                      onClick={() =>
                        window.scrollTo({ top: 0, behavior: "smooth" })
                      }
                    >
                      Voltar ao Topo
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar: Imports & Action Control */}
        <div className="xl:col-span-4 space-y-8">
          <Card className="border-none shadow-2xl shadow-slate-200/50 rounded-3xl overflow-hidden ring-1 ring-slate-100 sticky top-6">
            <CardHeader className="bg-slate-50/80 border-b border-slate-100 py-8 px-8">
              <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-3">
                <UserPlus className="w-5 h-5 text-orange-500" />
                GestÃ£o de Lista
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              {/* Tool 1: Client Database */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-7 w-7 rounded-lg bg-orange-100 flex items-center justify-center">
                    <Layers className="w-4 h-4 text-orange-600" />
                  </div>
                  <Label className="text-xs font-black uppercase text-slate-500 tracking-widest">
                    Base de Clientes
                  </Label>
                </div>
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                  <Input
                    placeholder="Nome ou telefone do cliente..."
                    className="pl-12 h-14 rounded-2xl border-slate-200 focus:ring-4 focus:ring-orange-50 focus:border-orange-500 bg-slate-50 group-hover:bg-white transition-all font-medium"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {isSearchingClients && (
                    <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-orange-500" />
                  )}

                  {foundClients.length > 0 && (
                    <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-50 max-h-[350px] overflow-y-auto p-2">
                      {foundClients.map((client) => (
                        <button
                          key={client.id}
                          className="w-full text-left px-5 py-4 hover:bg-slate-50 rounded-xl flex flex-col group/item transition-colors mb-1 border border-transparent hover:border-slate-100"
                          onClick={() => handleAddClient(client)}
                        >
                          <span className="font-bold text-slate-800 group-hover/item:text-orange-700">
                            {client.nome_fantasia || client.razao_social}
                          </span>
                          <span className="text-xs text-slate-400 flex items-center gap-2 font-medium mt-1">
                            <div className="h-1 w-1 rounded-full bg-slate-300"></div>
                            {client.celular || client.telefone}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  variant="outline"
                  className="w-full border-2 border-orange-100 text-orange-700 bg-orange-50/20 hover:bg-orange-600 hover:text-white hover:border-orange-600 h-14 transition-all font-black text-xs rounded-2xl group shadow-sm hover:shadow-orange-100"
                  onClick={handleSelectAllClients}
                  disabled={loading}
                >
                  {allClientsSelected ? (
                    <CheckCircle2 className="w-5 h-5 mr-3" />
                  ) : (
                    <UserCheck className="w-5 h-5 mr-3 group-hover:animate-bounce" />
                  )}
                  IMPORTAR TODA A BASE
                </Button>
              </div>

              <div className="relative flex items-center py-2 h-0">
                <div className="flex-grow border-t border-slate-100"></div>
                <span className="flex-shrink mx-4 text-[10px] font-black text-slate-300 tracking-widest leading-none">
                  OU
                </span>
                <div className="flex-grow border-t border-slate-100"></div>
              </div>

              {/* Tool 2: Batch Manual Add */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-slate-600" />
                  </div>
                  <Label className="text-xs font-black uppercase text-slate-500 tracking-widest">
                    Colar Contatos
                  </Label>
                </div>
                <Textarea
                  placeholder="Ex: Juliano, 92991223344"
                  className="min-h-[140px] text-sm rounded-2xl resize-none bg-slate-50 border-slate-200 focus:ring-4 focus:ring-slate-100 p-5 font-medium leading-relaxed"
                  value={contactInput}
                  onChange={(e) => setContactInput(e.target.value)}
                />
                <Button
                  className="w-full h-12 rounded-xl font-black text-xs shadow-sm active:scale-95 transition-all"
                  onClick={handleAddManualContacts}
                >
                  ADICIONAR Ã€ LISTA
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CampaignCreatePage;

