import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { funcionariosMock } from "@/data/funcionarios";
import { fetchEmployees } from "@/lib/api";

export default function FuncionariosListaPage() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [employees, setEmployees] = useState<typeof funcionariosMock>(funcionariosMock);

  useEffect(() => {
    let mounted = true;
    fetchEmployees()
      .then((data) => {
        if (mounted && data) setEmployees(data as any);
      })
      .catch(() => {
        // keep mocks on error
      });
    return () => {
      mounted = false;
    };
  }, []);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((f) =>
      [f.nomeCompleto, f.id, f.cargo, f.setor, f.gestorDireto]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [busca]);

  const handleSair = () => {
    window.location.href = "/";
  };

  return (
    <div className="flex h-screen bg-sis-bg-light">
      <Sidebar onSair={handleSair} />
      <div className="flex flex-1 flex-col">
        <Header onRegistrarDesvio={() => navigate("/gestor/registrar")} userType="gestor" />
        <div className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            <div>
              <h1 className="mb-2 font-open-sans text-3xl font-bold text-sis-dark-text">
                Funcionários
              </h1>
              <p className="font-roboto text-sm text-sis-secondary-text">
                Selecione um colaborador para visualizar os detalhes e histórico disciplinar.
              </p>
            </div>

            <Card className="border-sis-border bg-white">
              <CardHeader>
                <CardTitle className="text-lg">Buscar Funcionários</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="md:col-span-2">
                    <Input
                      placeholder="Buscar por nome, matrícula, cargo ou setor"
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="rounded-md border border-sis-border bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[28%]">Nome Completo</TableHead>
                    <TableHead className="w-[14%]">Matrícula</TableHead>
                    <TableHead className="w-[20%]">Cargo</TableHead>
                    <TableHead className="w-[20%]">Setor/Departamento</TableHead>
                    <TableHead className="w-[12%]">Gestor Direto</TableHead>
                    <TableHead className="w-[6%] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium truncate">{f.nomeCompleto}</TableCell>
                      <TableCell>{f.id}</TableCell>
                      <TableCell className="truncate">{f.cargo}</TableCell>
                      <TableCell className="truncate">{f.setor}</TableCell>
                      <TableCell className="truncate">{f.gestorDireto}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/gestor/funcionarios/${f.id}`)}
                        >
                          Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtrados.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                        Nenhum funcionário encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
