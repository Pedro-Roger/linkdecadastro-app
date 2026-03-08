import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/@theme/ui/dialog";
import { Input } from "@/@theme/ui/input";
import { Badge } from "@/@theme/ui/badge";
import { Search, Package, ImageIcon, ShoppingBag } from "lucide-react";
import { ProductsService } from "../../products/services/products.service";
import { ProductDto } from "../../products/dto/product.dto";
import { ScrollArea } from "@/@theme/ui/scroll-area";
import useNotification from "@/hooks/useNotification";

interface ProductCatalogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectProduct: (product: ProductDto) => void;
}

export const ProductCatalogModal: React.FC<ProductCatalogModalProps> = ({
  open,
  onOpenChange,
  onSelectProduct,
}) => {
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const { notify } = useNotification();
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchProducts = async (isNewSearch = false) => {
    try {
      setLoading(true);
      const currentPage = isNewSearch ? 1 : page;

      const response = await ProductsService.findAll({
        page: currentPage,
        limit: 20,
        search: search,
      });

      if (isNewSearch) {
        setProducts(response.data);
        setPage(1);
      } else {
        setProducts((prev) => [...prev, ...response.data]);
      }
      setTotal(response.total);
    } catch (error) {
      console.error("Error fetching products:", error);
      notify("Erro ao buscar produtos", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchProducts(true);
    }
  }, [open, search]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (document.documentElement.classList.contains("dark")) {
      // Adjust for dark mode if needed
    }

    if (
      scrollHeight - scrollTop <= clientHeight + 50 &&
      !loading &&
      products.length < total
    ) {
      setPage((prev) => prev + 1);
      fetchProducts();
    }
  };

  const formatPrice = (value?: number) => {
    if (value === undefined || value === null) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 border-b border-slate-100">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">
            <ShoppingBag className="w-5 h-5 text-orange-600" />
            CatÃ¡logo de Produtos
          </DialogTitle>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar produtos por nome, SKU..."
              className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-all"
            />
          </div>
        </DialogHeader>

        <ScrollArea
          className="flex-1 bg-slate-50/50 p-6"
          onScroll={handleScroll}
        >
          {products.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Package className="w-12 h-12 mb-3 stroke-1" />
              <p>Nenhum produto encontrado</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-orange-200 transition-all cursor-pointer group flex flex-col"
                  onClick={() => onSelectProduct(product)}
                >
                  <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                    {product.files && product.files.length > 0 ? (
                      <img
                        src={product.files[0].url}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <ImageIcon className="w-10 h-10" />
                      </div>
                    )}
                    <Badge className="absolute top-2 right-2 bg-white/90 text-slate-900 border-none shadow-sm backdrop-blur-sm hover:bg-white">
                      {formatPrice(product.price)}
                    </Badge>
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-semibold text-slate-800 line-clamp-2 mb-1 group-hover:text-orange-600 transition-colors">
                      {product.name}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mb-3 flex-1">
                      {product.description || "Sem descriÃ§Ã£o"}
                    </p>
                    <div className="flex items-center justify-between text-xs text-slate-400 mt-auto pt-3 border-t border-slate-50">
                      <span>SKU: {product.sku || "-"}</span>
                      <span
                        className={
                          product.stock_quantity > 0
                            ? "text-emerald-600 font-medium"
                            : "text-red-500 font-medium"
                        }
                      >
                        {product.stock_quantity > 0
                          ? `${product.stock_quantity} em estoque`
                          : "Sem estoque"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {loading && (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

