import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import SidebarJuridico from "@/components/SidebarJuridico";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RichTextEditor from "@/components/RichTextEditor";
import { useToast } from "@/hooks/use-toast";
import { fetchProcessById } from "@/lib/api";
import { errorMessage } from "@/lib/utils";

export default function RevisaoProcessoJuridico() {
  const navegar = useNavigate();
  const parametros = useParams<{ id: string }>();
  const { toast } = useToast();

  const idProcesso = parametros.id as string;
  const [processoJuridico, setProcessoJuridico] = useState<any | null>(null);
  const somenteVisualizacao = processoJuridico?.status === "Finalizado";

  const [parecerJuridico, setParecerJuridico] = useState<string>("");
  const [decisao, setDecisao] = useState<string>("");
  const [medidaRecomendada, setMedidaRecomendada] = useState<string>("");
  const [numeroOcorrenciaSI, setNumeroOcorrenciaSI] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    if (!idProcesso) return;
    fetchProcessById(idProcesso)
      .then((p) => { if (mounted) setProcessoJuridico(p as any); })
      .catch(() => setProcessoJuridico(null));
    return () => { mounted = false; };
  }, [idProcesso]);

  const aoFinalizar = async () => {
    if (!decisao) {
      toast({ title: "Selecione o Resultado da Análise", description: "Campo obrigatório." });
      return;
    }
    if (decisao === "Aplicar Medida Disciplinar" && !medidaRecomendada) {
      toast({ title: "Selecione a Medida Recomendada", description: "Campo obrigatório quando aplicar medida disciplinar." });
      return;
    }

    const resolucao =
      decisao === "Arquivar Processo"
        ? "Arquivado"
        : decisao === "Aplicar Medida Disciplinar"
        ? `Medida disciplinar: ${medidaRecomendada}`
        : "Recomendação: Justa Causa Direta";

    try {
      const patch = { status: "Finalizado" as any, resolucao: `${resolucao}${parecerJuridico ? ` — Parecer: ${parecerJuridico}` : ""}` };
      const { updateProcess } = await import("@/lib/api");
      await updateProcess(idProcesso, patch as any);
      toast({ title: "Análise finalizada", description: "Decisão salva com sucesso." });
      navegar("/juridico");
    } catch (e: any) {
      toast({ title: "Erro ao salvar decisão", description: errorMessage(e) });
    }
  };

  const aoSair = () => {
    window.location.href = "/";
  };

  return (
    <div className="flex h-screen bg-sis-bg-light">
      <SidebarJuridico onSair={aoSair} />
      <div className="flex flex-1 flex-col">
                <div className="flex-1 overflow-auto p-4 md:p-6">
          <div className="mx-auto max-w-5xl space-y-6">
            {!processoJuridico ? (
              <Card className="border-sis-border bg-white">
                <CardContent className="p-6 space-y-4">
                  <h1 className="font-open-sans text-2xl font-bold text-sis-dark-text">Processo não encontrado</h1>
                  <Button variant="outline" onClick={() => navegar(-1)}>Voltar</Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div>
                  <h1 className="mb-2 font-open-sans text-3xl font-bold text-sis-dark-text">Análise Jurídica do Processo</h1>
                  <p className="font-roboto text-sis-secondary-text">Registre a sindicância, parecer e decisão final.</p>
                </div>

                {/* 1. Informações do Gestor */}
                <Card className="border-sis-border bg-white">
                  <CardHeader>
                    <CardTitle>Informações do Gestor</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <Label className="text-xs text-sis-secondary-text">Funcionário</Label>
                        <p className="font-medium text-sis-dark-text">{processoJuridico?.funcionario}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-sis-secondary-text">Data de Abertura</Label>
                        <p className="font-medium text-sis-dark-text">{processoJuridico?.dataAbertura}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-sis-secondary-text">Tipo de Desvio</Label>
                        <p className="font-medium text-sis-dark-text">{processoJuridico?.tipoDesvio}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-sis-secondary-text">Classificação</Label>
                        <p className="font-medium text-sis-dark-text">{processoJuridico?.classificacao}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-sis-secondary-text">Data de Abertura</Label>
                        <p className="font-medium text-sis-dark-text">{processoJuridico?.dataAbertura}</p>
                      </div>
                    </div>
                                      </CardContent>
                </Card>

                {/* 2. Análise Jurídica / Sindicância */}
                <Card className="border-sis-border bg-white">
                  <CardHeader>
                    <CardTitle>Análise Jurídica / Sindicância</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="mb-2 block text-xs text-sis-secondary-text">Parecer Jurídico</Label>
                      {somenteVisualizacao ? (
                        <div
                          className="min-h-[120px] rounded-md border border-sis-border bg-gray-50 p-3 text-sm"
                          dangerouslySetInnerHTML={{ __html: processoJuridico?.legalOpinionSaved || "<em>Sem parecer registrado.</em>" }}
                        />
                      ) : (
                        <RichTextEditor
                          value={parecerJuridico}
                          onChange={setParecerJuridico}
                          placeholder="Escreva aqui o parecer jurídico..."
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 3. Decisão */}
                <Card className="border-sis-border bg-white">
                  <CardHeader>
                    <CardTitle>Decisão</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {somenteVisualizacao ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div>
                            <Label className="text-xs text-sis-secondary-text">Resultado da Análise</Label>
                            <p className="font-medium text-sis-dark-text">{processoJuridico?.status || "—"}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-sis-secondary-text">Medida Recomendada/Aplicada</Label>
                            <p className="font-medium text-sis-dark-text">{processoJuridico?.resolucao || "—"}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-sis-secondary-text">Data da Decisão</Label>
                            <p className="font-medium text-sis-dark-text">{processoJuridico?.dataAbertura || "—"}</p>
                          </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                          <Button variant="outline" onClick={() => navegar(-1)}>Voltar</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div>
                            <Label className="mb-2 block text-xs text-sis-secondary-text">Resultado da Análise</Label>
                            <Select onValueChange={setDecisao} value={decisao}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o resultado" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Arquivar Processo">Arquivar Processo</SelectItem>
                                <SelectItem value="Aplicar Medida Disciplinar">Aplicar Medida Disciplinar (Advertência ou Suspensão)</SelectItem>
                                <SelectItem value="Recomendar Justa Causa Direta">Recomendar Justa Causa Direta</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {decisao === "Aplicar Medida Disciplinar" && (
                            <div>
                              <Label className="mb-2 block text-xs text-sis-secondary-text">Medida Recomendada</Label>
                              <Select onValueChange={setMedidaRecomendada} value={medidaRecomendada}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione a medida" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Advertência Escrita">Advertência Escrita</SelectItem>
                                  <SelectItem value="Suspensão de 1 dia">Suspensão de 1 dia</SelectItem>
                                  <SelectItem value="Suspensão de 3 dias">Suspensão de 3 dias</SelectItem>
                                  <SelectItem value="Suspensão de 5 dias">Suspensão de 5 dias</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-3 pt-2">
                          <Button variant="outline" onClick={() => navegar(-1)}>Voltar</Button>
                          <Button onClick={aoFinalizar} className="bg-sis-blue hover:bg-blue-700 text-white">
                            Finalizar Análise e Salvar Decisão
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
