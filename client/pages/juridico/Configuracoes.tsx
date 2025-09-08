import { useState } from "react";
import { useNavigate } from "react-router-dom";

import SidebarJuridico from "@/components/SidebarJuridico";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export default function Configuracoes() {
  const navegar = useNavigate();
  const { toast } = useToast();

  const [emailNotificacao, setEmailNotificacao] = useState(true);
  const [prazoLeve, setPrazoLeve] = useState(5);
  const [prazoMedia, setPrazoMedia] = useState(10);
  const [prazoGrave, setPrazoGrave] = useState(15);
  const [prazoGravissima, setPrazoGravissima] = useState(20);
  const [medidaPadrao, setMedidaPadrao] = useState<string>("");

  const salvar = () => {
    // eslint-disable-next-line no-console
    console.log({ emailNotificacao, prazos: { prazoLeve, prazoMedia, prazoGrave, prazoGravissima }, medidaPadrao });
    toast({ title: "Configurações salvas", description: "Suas preferências foram atualizadas." });
  };

  const aoSair = () => {
    window.location.href = "/";
  };

  return (
    <div className="flex h-screen bg-sis-bg-light">
      <SidebarJuridico onSair={aoSair} />
      <div className="flex flex-1 flex-col">
                <div className="flex-1 overflow-auto p-4 md:p-6">
          <div className="mx-auto grid max-w-5xl gap-6">
            <div>
              <h1 className="mb-2 font-open-sans text-3xl font-bold text-sis-dark-text">Configurações (Jurídico)</h1>
              <p className="font-roboto text-sis-secondary-text">Defina preferências, prazos e padrões do fluxo jurídico.</p>
            </div>

            <Card className="border-sis-border bg-white">
              <CardHeader><CardTitle>Notificações</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Receber notificações por e-mail</Label>
                    <p className="text-xs text-sis-secondary-text">Alertas de novos processos e prazos.</p>
                  </div>
                  <Switch checked={emailNotificacao} onCheckedChange={setEmailNotificacao} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-sis-border bg-white">
              <CardHeader><CardTitle>Prazos (SLA)</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label className="mb-1 block">Leve (dias)</Label>
                  <Input type="number" value={prazoLeve} onChange={(e) => setPrazoLeve(Number(e.target.value))} />
                </div>
                <div>
                  <Label className="mb-1 block">Média (dias)</Label>
                  <Input type="number" value={prazoMedia} onChange={(e) => setPrazoMedia(Number(e.target.value))} />
                </div>
                <div>
                  <Label className="mb-1 block">Grave (dias)</Label>
                  <Input type="number" value={prazoGrave} onChange={(e) => setPrazoGrave(Number(e.target.value))} />
                </div>
                <div>
                  <Label className="mb-1 block">Gravíssima (dias)</Label>
                  <Input type="number" value={prazoGravissima} onChange={(e) => setPrazoGravissima(Number(e.target.value))} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-sis-border bg-white">
              <CardHeader><CardTitle>Padrões</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="mb-1 block">Medida disciplinar padrão</Label>
                  <Select value={medidaPadrao} onValueChange={setMedidaPadrao}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Advertência Escrita">Advertência Escrita</SelectItem>
                      <SelectItem value="Suspensão de 1 dia">Suspensão de 1 dia</SelectItem>
                      <SelectItem value="Suspensão de 3 dias">Suspensão de 3 dias</SelectItem>
                      <SelectItem value="Suspensão de 5 dias">Suspensão de 5 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-3">
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
