import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "@/components/Header";
import SidebarJuridico from "@/components/SidebarJuridico";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RichTextEditor from "@/components/RichTextEditor";
import { legalCasesAwaitingMock } from "@/data/legal";
import { useToast } from "@/hooks/use-toast";

export default function LegalCaseReview() {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const { toast } = useToast();

  const caseId = params.id as string;
  const legalCase = useMemo(() => legalCasesAwaitingMock.find((c) => c.id === caseId), [caseId]);

  const [legalOpinion, setLegalOpinion] = useState<string>("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [decision, setDecision] = useState<string>("");
  const [recommendedMeasure, setRecommendedMeasure] = useState<string>("");

  const handleFilesChange = (files: FileList | null) => {
    if (!files) return;
    setUploadedFiles(Array.from(files));
  };

  const handleSubmit = () => {
    if (!decision) {
      toast({ title: "Selecione o Resultado da Análise", description: "Campo obrigatório." });
      return;
    }
    if (decision === "Aplicar Medida Disciplinar" && !recommendedMeasure) {
      toast({ title: "Selecione a Medida Recomendada", description: "Campo obrigatório quando aplicar medida disciplinar." });
      return;
    }

    // Simulate save
    // eslint-disable-next-line no-console
    console.log({
      id: caseId,
      legalOpinion,
      uploadedFiles: uploadedFiles.map((f) => f.name),
      decision,
      recommendedMeasure: decision === "Aplicar Medida Disciplinar" ? recommendedMeasure : undefined,
    });

    toast({ title: "Análise finalizada", description: "Decisão salva com sucesso." });
    navigate("/juridico");
  };

  const handleLogout = () => {
    window.location.href = "/";
  };

  return (
    <div className="flex h-screen bg-sis-bg-light">
      <SidebarJuridico onSair={handleLogout} />
      <div className="flex flex-1 flex-col">
        <Header onRegistrarDesvio={() => navigate("/gestor/registrar")} userType="juridico" />
        <div className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-5xl space-y-6">
            {!legalCase ? (
              <Card className="border-sis-border bg-white">
                <CardContent className="p-6 space-y-4">
                  <h1 className="font-open-sans text-2xl font-bold text-sis-dark-text">Processo não encontrado</h1>
                  <Button variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div>
                  <h1 className="mb-2 font-open-sans text-3xl font-bold text-sis-dark-text">Análise Jurídica do Processo</h1>
                  <p className="font-roboto text-sis-secondary-text">Registre a sindicância, parecer e decisão final.</p>
                </div>

                {/* 1. Manager Information (read-only) */}
                <Card className="border-sis-border bg-white">
                  <CardHeader>
                    <CardTitle>Informações do Gestor</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <Label className="text-xs text-sis-secondary-text">Funcionário</Label>
                        <p className="font-medium text-sis-dark-text">{legalCase.employeeName}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-sis-secondary-text">Data da Ocorrência</Label>
                        <p className="font-medium text-sis-dark-text">{legalCase.occurrenceDate}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-sis-secondary-text">Tipo de Desvio</Label>
                        <p className="font-medium text-sis-dark-text">{legalCase.deviationType}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-sis-secondary-text">Classificação</Label>
                        <p className="font-medium text-sis-dark-text">{legalCase.classification}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-sis-secondary-text">Data de Encaminhamento</Label>
                        <p className="font-medium text-sis-dark-text">{legalCase.referralDate}</p>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-sis-secondary-text">Descrição Detalhada (Gestor)</Label>
                      <p className="text-sm text-sis-dark-text">{legalCase.managerDescription}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-sis-secondary-text">Documentos Anexados (Gestor)</Label>
                      <ul className="list-disc pl-5 text-sm">
                        {legalCase.managerAttachments.map((a) => (
                          <li key={a.name}>
                            <a href={a.url} className="text-blue-600 hover:underline" target="_blank" rel="noreferrer">
                              {a.name}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                {/* 2. Legal Analysis */}
                <Card className="border-sis-border bg-white">
                  <CardHeader>
                    <CardTitle>Análise Jurídica / Sindicância</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="mb-2 block text-xs text-sis-secondary-text">Parecer Jurídico</Label>
                      <RichTextEditor
                        value={legalOpinion}
                        onChange={setLegalOpinion}
                        placeholder="Escreva aqui o parecer jurídico..."
                      />
                    </div>
                    <div>
                      <Label className="mb-2 block text-xs text-sis-secondary-text">Anexar Documentos da Sindicância</Label>
                      <Input type="file" multiple onChange={(e) => handleFilesChange(e.target.files)} />
                      {uploadedFiles.length > 0 && (
                        <ul className="mt-2 list-disc pl-5 text-sm">
                          {uploadedFiles.map((f) => (
                            <li key={f.name}>{f.name}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 3. Decision */}
                <Card className="border-sis-border bg-white">
                  <CardHeader>
                    <CardTitle>Decisão</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <Label className="mb-2 block text-xs text-sis-secondary-text">Resultado da Análise</Label>
                        <Select onValueChange={setDecision} value={decision}>
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
                      {decision === "Aplicar Medida Disciplinar" && (
                        <div>
                          <Label className="mb-2 block text-xs text-sis-secondary-text">Medida Recomendada</Label>
                          <Select onValueChange={setRecommendedMeasure} value={recommendedMeasure}>
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
                      <Button variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
                      <Button onClick={handleSubmit} className="bg-sis-blue hover:bg-blue-700 text-white">
                        Finalizar Análise e Salvar Decisão
                      </Button>
                    </div>
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
