import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import Sidebar from "@/components/Sidebar";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { errorMessage } from "@/lib/utils";

export default function GestorRegistrarDesvio() {
  const [funcionarioId, setFuncionarioId] = useState("");
  const [funcionarios, setFuncionarios] = useState<Array<{ id: string; nome: string }>>([]);
  const [dataOcorrencia, setDataOcorrencia] = useState("");
  const [tipoDesvio, setTipoDesvio] = useState("");
  const [classificacao, setClassificacao] = useState("");
  const [descricao, setDescricao] = useState("");
  const [anexos, setAnexos] = useState<File[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase.from("employees").select("id,nome_completo,matricula");
      if (error) {
        console.error(error);
        return;
      }
      if (!mounted) return;
      setFuncionarios((data || []).map((e: any) => ({ id: e.id, nome: e.nome_completo ?? e.matricula ?? e.id })));
    })();
    return () => { mounted = false; };
  }, []);

  const enviarFormulario = async (e: FormEvent) => {
    e.preventDefault();

    if (!funcionarioId || !dataOcorrencia || !tipoDesvio || !classificacao || !descricao) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    try {
      const auth = await supabase.auth.getUser();
      const userId = auth?.data?.user?.id;

      if (!userId) {
        toast.error("Você precisa estar autenticado para registrar um desvio.");
        return;
      }

      const genId = () => (typeof crypto !== "undefined" && (crypto as any).randomUUID ? (crypto as any).randomUUID() : ([1e7] as any + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c: any) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)));
      const payload: any = {
        id: genId(),
        employee_id: funcionarioId,
        tipo_desvio: tipoDesvio,
        classificacao: classificacao === "Média" ? "Media" : classificacao,
        descricao,
        status: "Em_Analise",
        criado_por_user_id: userId,
      };

      const { error } = await supabase.from("processes").insert(payload);
      if (error) throw error;

      toast.success("Desvio registrado com sucesso!");

      setFuncionarioId("");
      setDataOcorrencia("");
      setTipoDesvio("");
      setClassificacao("");
      setDescricao("");
      setAnexos([]);
    } catch (err: any) {
      console.error(err);
      toast.error(errorMessage(err) || "Erro ao registrar desvio");
    }
  };

  const onChangeArquivos = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAnexos(files);
  };

  return (
    <div className="flex h-screen bg-sis-bg-light">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <div className="mx-auto max-w-5xl">
            <h1 className="mb-2 font-open-sans text-3xl font-bold text-sis-dark-text">Registrar Desvio</h1>
            <p className="mb-8 font-roboto text-sis-secondary-text">
              Preencha as informações abaixo para iniciar o processo disciplinar.
            </p>

            <form onSubmit={enviarFormulario} className="space-y-6 rounded-md border border-sis-border bg-white p-6 shadow-[0_0_2px_0_rgba(23,26,31,0.12),0_0_1px_0_rgba(23,26,31,0.07)]">
              {/* Funcionário */}
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="sm:col-span-1">
                  <label className="mb-1 block font-roboto text-sm font-medium text-sis-dark-text">
                    Funcionário
                  </label>
                  <select
                    value={funcionarioId}
                    onChange={(e) => setFuncionarioId(e.target.value)}
                    className="w-full rounded-md border border-sis-border bg-white px-3 py-2 font-roboto text-sm text-sis-dark-text focus:border-sis-blue focus:outline-none focus:ring-1 focus:ring-sis-blue"
                  >
                    <option value="" disabled>Selecione...</option>
                    {funcionarios.map((f) => (
                      <option key={f.id} value={f.id}>{f.nome}</option>
                    ))}
                  </select>
                </div>

                {/* Data da Ocorrência */}
                <div className="sm:col-span-1">
                  <label className="mb-1 block font-roboto text-sm font-medium text-sis-dark-text">
                    Data da Ocorrência
                  </label>
                  <input
                    type="date"
                    value={dataOcorrencia}
                    onChange={(e) => setDataOcorrencia(e.target.value)}
                    className="w-full rounded-md border border-sis-border bg-white px-3 py-2 font-roboto text-sm text-sis-dark-text focus:border-sis-blue focus:outline-none focus:ring-1 focus:ring-sis-blue"
                  />
                </div>
              </div>

              {/* Tipo de desvio */}
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-roboto text-sm font-medium text-sis-dark-text">
                    Tipo de Desvio
                  </label>
                  <select
                    value={tipoDesvio}
                    onChange={(e) => setTipoDesvio(e.target.value)}
                    className="w-full rounded-md border border-sis-border bg-white px-3 py-2 font-roboto text-sm text-sis-dark-text focus:border-sis-blue focus:outline-none focus:ring-1 focus:ring-sis-blue"
                  >
                    <option value="" disabled>
                      Selecione...
                    </option>
                    <option>Atraso</option>
                    <option>Falta Injustificada</option>
                    <option>Comportamento Inadequado</option>
                    <option>Uso Indevido de Recursos</option>
                    <option>Descumprimento de Normas</option>
                    <option>Quebra de Confidencialidade</option>
                    <option>Outro</option>
                  </select>
                </div>

                {/* Classificação do desvio */}
                <div>
                  <label className="mb-1 block font-roboto text-sm font-medium text-sis-dark-text">
                    Classificação do Desvio
                  </label>
                  <select
                    value={classificacao}
                    onChange={(e) => setClassificacao(e.target.value)}
                    className="w-full rounded-md border border-sis-border bg-white px-3 py-2 font-roboto text-sm text-sis-dark-text focus:border-sis-blue focus:outline-none focus:ring-1 focus:ring-sis-blue"
                  >
                    <option value="" disabled>
                      Selecione...
                    </option>
                    <option>Leve</option>
                    <option>Média</option>
                    <option>Grave</option>
                    <option>Gravíssima</option>
                  </select>
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="mb-1 block font-roboto text-sm font-medium text-sis-dark-text">
                  Descrição Detalhada
                </label>
                <textarea
                  rows={5}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descreva a ocorrência com detalhes, incluindo local, testemunhas e contexto."
                  className="w-full rounded-md border border-sis-border bg-white px-3 py-2 font-roboto text-sm text-sis-dark-text placeholder:text-sis-secondary-text focus:border-sis-blue focus:outline-none focus:ring-1 focus:ring-sis-blue"
                />
              </div>

              {/* Anexos */}
              <div>
                <label className="mb-1 block font-roboto text-sm font-medium text-sis-dark-text">
                  Anexar Documentos (opcional)
                </label>
                <input
                  type="file"
                  multiple
                  onChange={onChangeArquivos}
                  className="block w-full cursor-pointer rounded-md border border-sis-border bg-white px-3 py-2 font-roboto text-sm text-sis-dark-text file:mr-4 file:rounded-md file:border-0 file:bg-sis-blue file:px-4 file:py-2 file:font-medium file:text-white hover:file:bg-blue-700"
                />
                {anexos.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-6 font-roboto text-sm text-sis-secondary-text">
                    {anexos.map((f) => (
                      <li key={f.name}>{f.name}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setFuncionarioId("");
                    setDataOcorrencia("");
                    setTipoDesvio("");
                    setClassificacao("");
                    setDescricao("");
                    setAnexos([]);
                  }}
                  className="rounded-md border border-sis-border bg-white px-4 py-2 font-roboto text-sm text-sis-dark-text hover:bg-gray-50"
                >
                  Limpar
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-sis-blue px-4 py-2 font-roboto text-sm font-medium text-white hover:bg-blue-700"
                >
                  Registrar Desvio
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
