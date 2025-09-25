import { useState } from 'react';
import SidebarAdministrador from '@/components/SidebarAdministrador';
import { authHeaders } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { errorMessage } from '@/lib/utils';

export default function ImportarFuncionariosPage() {
  const { toast } = useToast();
  const [fileText, setFileText] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [result, setResult] = useState<any | null>(null);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    const txt = await f.text();
    setFileText(txt);
  };

  const enviar = async () => {
    if (!fileText) {
      toast({ title: 'Selecione um arquivo CSV primeiro' });
      return;
    }
    setStatus('Enviando e processando a planilha... Por favor, aguarde.');
    setResult(null);
    try {
      const res = await fetch('/api/admin/import-employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ csv: fileText }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || JSON.stringify(body));
      setResult(body);
      setStatus(`Importação concluída! Funcionários inseridos: ${body.inserted}. Atualizados: ${body.updated}. Erros: ${body.errors}`);
    } catch (e: any) {
      console.error(e);
      setStatus('Erro ao processar importação: ' + errorMessage(e));
    }
  };

  return (
    <div className="flex h-screen bg-sis-bg-light">
      <SidebarAdministrador onSair={() => (window.location.href = '/')} />
      <div className="flex flex-1 flex-col">
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <div className="mx-auto max-w-4xl space-y-6">
            <div>
              <h1 className="mb-2 font-open-sans text-3xl font-bold text-sis-dark-text">Importar Funcionários</h1>
              <p className="font-roboto text-sis-secondary-text">Envie um arquivo CSV com as colunas: matricula, nome_completo, cargo, setor, gestor_id</p>
            </div>

            <Card className="border-sis-border bg-white">
              <CardHeader>
                <CardTitle>Upload</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Input type="file" onChange={onFileChange as any} accept=".csv" />
                  {fileName && <div className="text-sm text-sis-secondary-text mt-2">Arquivo selecionado: {fileName}</div>}
                </div>

                <div className="flex gap-3">
                  <Button onClick={enviar} className="bg-sis-blue text-white">Enviar</Button>
                  <Button variant="outline" onClick={() => { setFileText(null); setFileName(''); setStatus(''); setResult(null); }}>Limpar</Button>
                </div>

                {status && <div className="mt-4 p-3 rounded-md bg-gray-50 text-sm">{status}</div>}

                {result && (
                  <div className="mt-4 p-3 rounded-md bg-white border">
                    <h3 className="font-medium">Resumo</h3>
                    <pre className="text-xs mt-2">{JSON.stringify(result, null, 2)}</pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
