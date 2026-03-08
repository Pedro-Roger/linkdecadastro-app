import React from "react";
import { WhatsAppConversation } from "../../organization/services/whatsapp.service";
import { Button } from "@/@theme/ui/button";
import { AlertCircle, Link2, UserPlus } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/@theme/ui/alert";

interface BannerNewClientProps {
  selectedConversation: WhatsAppConversation;
  onOpenLinkClientDialog: () => void;
  onCadastrarNovoCliente: () => void;
}

export const BannerNewClient: React.FC<BannerNewClientProps> = ({
  selectedConversation,
  onOpenLinkClientDialog,
  onCadastrarNovoCliente,
}) => {
  if (selectedConversation.client) return null;

  return (
    <Alert variant="warning" className="mx-6 mt-4 mb-0 flex items-center gap-4">
      <AlertCircle className="h-5 w-5" />
      <div className="flex-1">
        <AlertTitle className="text-sm font-semibold">
          Cliente novo — não encontrado na sua base pelo o número de celular
        </AlertTitle>
        <AlertDescription className="text-xs mt-0.5">
          Cadastre como novo cliente ou busque na base para vincular esta
          conversa.
        </AlertDescription>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={onOpenLinkClientDialog}
        >
          <Link2 className="w-4 h-4" />
          Buscar para vincular
        </Button>
        <Button
          type="button"
          size="sm"
          className="gap-2"
          onClick={onCadastrarNovoCliente}
        >
          <UserPlus className="w-4 h-4" />
          Cadastrar como novo
        </Button>
      </div>
    </Alert>
  );
};
