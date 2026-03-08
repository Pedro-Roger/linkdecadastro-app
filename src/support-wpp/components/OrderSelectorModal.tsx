import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/@theme/ui/dialog";
import { Input } from "@/@theme/ui/input";
import { Button } from "@/@theme/ui/button";
import { Search, Loader2 } from "lucide-react";
import { ScrollArea } from "@/@theme/ui/scroll-area";
import { OrderService } from "@/modules/orders/services/order.service";
import { OrderDto } from "@/modules/orders/dto/Order.dto";
import { PaginationDataDto } from "@/shared/dtos/AbstractEntityWithFilesDto";
import { Badge } from "@/@theme/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface OrderSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectOrder: (order: OrderDto, url: string) => void;
  clientId?: string;
}

export const OrderSelectorModal: React.FC<OrderSelectorModalProps> = ({
  open,
  onOpenChange,
  onSelectOrder,
  clientId,
}) => {
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { toast } = useToast();

  const fetchOrders = async (reset = false) => {
    try {
      setLoading(true);
      const currentPage = reset ? 1 : page;

      const filters: any = {
        page: currentPage,
        limit: 10,
        search: searchTerm,
      };

      if (clientId) {
        filters.client_id = clientId;
      }

      let response: PaginationDataDto<OrderDto>;
      if (clientId) {
        response = await OrderService.getOrdersByClient(clientId, filters);
      } else {
        response = await OrderService.getOrders(filters);
      }

      if (reset) {
        setOrders(response.data);
      } else {
        setOrders((prev) => [...prev, ...response.data]);
      }

      setHasMore(response.data.length === 10);
      setPage(currentPage + 1);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast({
        title: "Erro ao buscar pedidos",
        description: "NÃ£o foi possÃ­vel carregar a lista de pedidos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchOrders(true);
    }
  }, [open, searchTerm]); // Add debouncing for search in real app, simplistic here

  const handleSelect = async (order: OrderDto) => {
    try {
      setLoading(true);
      const { url } = await OrderService.getPublicLink(order.id);
      onSelectOrder(order, url);
      onOpenChange(false);
    } catch (error) {
      console.error("Error generating link:", error);
      toast({
        title: "Erro ao gerar link",
        description: "NÃ£o foi possÃ­vel gerar o link pÃºblico para este pedido.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Selecionar Pedido</DialogTitle>
          <DialogDescription>
            Escolha um pedido para enviar no chat.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Buscar por nÃºmero ou cliente..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="flex-1 p-6">
          <div className="grid gap-4 sm:grid-cols-1">
            {orders.map((order) => (
              <div
                key={order.id}
                className="group relative flex flex-col sm:flex-row items-center justify-between rounded-lg border p-4 bg-card text-card-foreground shadow-sm hover:border-blue-500 transition-colors cursor-pointer"
                onClick={() => handleSelect(order)}
              >
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex items-center justify-between w-full">
                    <span className="font-semibold text-lg">
                      #{order.order_number}
                    </span>
                    <Badge
                      variant={
                        order.status === "APPROVED" ? "default" : "secondary"
                      }
                    >
                      {order.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-500">
                    Data:{" "}
                    {new Date(order.created_at).toLocaleDateString("pt-BR")}
                  </div>
                  <div className="text-sm font-medium">
                    {(order.client as any)?.razao_social ||
                      (order.client as any)?.nome_fantasia ||
                      "Cliente Desconhecido"}
                  </div>
                  <div className="font-bold text-orange-600 mt-2">
                    {formatCurrency(order.total_amount || 0)}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
            {!loading && orders.length === 0 && (
              <div className="text-center py-10 text-gray-500">
                Nenhum pedido encontrado.
              </div>
            )}
            {!loading && hasMore && orders.length > 0 && (
              <div className="flex justify-center pt-4">
                <Button variant="ghost" onClick={() => fetchOrders()}>
                  Carregar mais
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

