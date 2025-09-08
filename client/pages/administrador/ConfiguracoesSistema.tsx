import { useState } from "react";
import { useNavigate } from "react-router-dom";

import SidebarAdministrador from "@/components/SidebarAdministrador";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function ConfiguracoesSistemaAdminPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [manutencao, setManutencao] = useState(false);
  const [notifEmail, setNotifEmail] = useState(true);
  const [senhaMin, setSenhaMin] = useState(8);
  const [tentativas, setTentativas] = useState(5);
  const [mfaObrigatoria, setMfaObrigatoria] = useState(false);

  const salvar = () => {
    // eslint-disable-next-line no-console
    console.log({ manutencao, notifEmail, senhaMin, tentativas, mfaObrigatoria });
    toast({ title: "Configurações salvas", description: "As configurações do sistema foram atualizadas." });
  };

  const aoSair = () => navigate("/");

  return (
    <div className="flex h-screen bg-sis-bg-light">
      <SidebarAdministrador onSair={aoSair} />
      <div className="flex flex-1 flex-col">
                <div className="flex-1 overflow-auto p-4 md:p-6">
          <div className="mx-auto grid max-w-5xl gap-6">
            <div>
              <h1 className="mb-2 font-open-sans text-3xl font-bold text-sis-dark-text">Configurações do Sistema</h1>
              <p className="font-roboto text-sis-secondary-text">Ajuste políticas de segurança, disponibilidade e notificações.</p>
            </div>

            <Card className="border-sis-border bg-white">
              <CardHeader><CardTitle>Disponibilidade</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Modo de manutenção</Label>
                    <p className="text-xs text-sis-secondary-text">Exibe aviso e restringe operações durante manutenções.</p>
                  </div>
                  <Switch checked={manutencao} onCheckedChange={setManutencao} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-sis-border bg-white">
              <CardHeader><CardTitle>Segurança</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label className="mb-1 block">Tamanho mínimo da senha</Label>
                  <Input type="number" min={6} value={senhaMin} onChange={(e) => setSenhaMin(Number(e.target.value))} />
                </div>
                <div>
                  <Label className="mb-1 block">Tentativas de login antes de bloqueio</Label>
                  <Input type="number" min={1} value={tentativas} onChange={(e) => setTentativas(Number(e.target.value))} />
                </div>
                <div className="flex items-center justify-between md:col-span-2">
                  <div>
                    <Label className="text-sm">MFA obrigatório</Label>
                    <p className="text-xs text-sis-secondary-text">Exigir autenticação em duas etapas para todos os usuários.</p>
                  </div>
                  <Switch checked={mfaObrigatoria} onCheckedChange={setMfaObrigatoria} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-sis-border bg-white">
              <CardHeader><CardTitle>Notificações</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">E-mails de notificação</Label>
                    <p className="text-xs text-sis-secondary-text">Receber alertas de eventos importantes do sistema.</p>
                  </div>
                  <Switch checked={notifEmail} onCheckedChange={setNotifEmail} />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" onClick={() => window.location.reload()}>Cancelar</Button>
                  <Button className="bg-sis-blue text-white hover:bg-blue-700" onClick={salvar}>Salvar</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
