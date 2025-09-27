import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import SidebarAdministrador from "@/components/SidebarAdministrador";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { updateUser, type PerfilUsuario, authHeaders, fetchAvailablePermissions, fetchProfilePermissions, fetchUserOverrides, saveUserOverrides, type UserOverride } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { errorMessage } from "@/lib/utils";

export default function UsuariosAdminPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  type Usuario = { id: string; nome: string; email: string; perfil: PerfilUsuario; ativo: boolean; criadoEm?: string; ultimoAcesso?: string | null };
  const [busca, setBusca] = useState("");
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [abrirNovo, setAbrirNovo] = useState(false);
  const [novo, setNovo] = useState<{ nome: string; email: string; password: string; perfil: PerfilUsuario; ativo: boolean; nomeCompleto?: string; matricula?: string; cargo?: string; setor?: string; gestorId?: string }>({ nome: "", email: "", password: "", perfil: "funcionario", ativo: true });
  const [novoOverrideMap, setNovoOverrideMap] = useState<Record<string, "default" | "grant" | "revoke">>({});

  const [abrirEditar, setAbrirEditar] = useState(false);
  const [alvoEdicao, setAlvoEdicao] = useState<Usuario | null>(null);
  const [edicao, setEdicao] = useState<{ nome: string; email: string; perfil: PerfilUsuario; ativo: boolean }>({ nome: "", email: "", perfil: "funcionario", ativo: true });

  const [allPerms, setAllPerms] = useState<string[]>([]);
  const [profilePerms, setProfilePerms] = useState<Record<string, string[]>>({});
  const [overrideMap, setOverrideMap] = useState<Record<string, "default" | "grant" | "revoke">>({});

  useEffect(() => {
    if (!abrirEditar || !alvoEdicao) return;
    (async () => {
      try {
        const [perms, profMap, userOv] = await Promise.all([
          fetchAvailablePermissions().catch(() => []),
          fetchProfilePermissions().catch(() => ({} as any)),
          fetchUserOverrides(alvoEdicao.id).catch(() => []),
        ]);
        setAllPerms(perms);
        setProfilePerms(profMap);
        const ov: Record<string, "default" | "grant" | "revoke"> = {};
        for (const p of perms) ov[p] = "default";
        for (const o of userOv as UserOverride[]) {
          if (o?.permission_name && (o.action === "grant" || o.action === "revoke")) ov[o.permission_name] = o.action;
        }
        setOverrideMap(ov);
      } catch {}
    })();
  }, [abrirEditar, alvoEdicao]);

  useEffect(() => {
    if (!abrirNovo) return;
    (async () => {
      try {
        const [perms, profMap] = await Promise.all([
          fetchAvailablePermissions().catch(() => []),
          fetchProfilePermissions().catch(() => ({} as any)),
        ]);
        setAllPerms(perms);
        setProfilePerms(profMap);
        const ov: Record<string, "default" | "grant" | "revoke"> = {};
        for (const p of perms) ov[p] = "default";
        setNovoOverrideMap(ov);
      } catch {}
    })();
  }, [abrirNovo]);

  const carregarUsuarios = async () => {
    const res = await fetch("/api/admin/users", { headers: await authHeaders() });
    if (!res.ok) {
      setUsuarios([]);
      return;
    }
    const body = await res.json();
    const rows: any[] = Array.isArray(body) ? body : [];
    setUsuarios(
      rows.map((p) => ({
        id: p.id,
        nome: p.nome ?? "",
        email: p.email ?? "",
        perfil: (p.perfil ?? "funcionario") as PerfilUsuario,
        ativo: p.ativo ?? true,
        criadoEm: new Date().toISOString(),
        ultimoAcesso: null,
      }))
    );
  };

  useEffect(() => {
    let mounted = true;
    carregarUsuarios().catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("profiles-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        carregarUsuarios().catch(() => {});
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return usuarios;
    return usuarios.filter((u) => [u.nome, u.email, u.id, u.perfil].join(" ").toLowerCase().includes(q));
  }, [busca, usuarios]);

  const alternarAtivo = async (id: string, ativo: boolean) => {
    const old = usuarios;
    setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, ativo } : u)));
    try {
      await updateUser(id, { ativo });
      toast({ title: ativo ? "Usuário ativado" : "Usuário desativado" });
    } catch (e: any) {
      setUsuarios(old);
      toast({ title: "Erro ao atualizar status", description: errorMessage(e) });
    }
  };

  const criarUsuario = async () => {
    if (!novo.nome || !novo.email || !novo.password || novo.password.length < 6) {
      toast({ title: "Preencha nome, e-mail e senha (mín. 6)" });
      return;
    }
    try {
      const employee = novo.perfil === "funcionario" ? {
        nomeCompleto: novo.nomeCompleto || novo.nome,
        matricula: novo.matricula || null,
        cargo: novo.cargo || null,
        setor: novo.setor || null,
        gestorId: novo.gestorId || null,
      } : undefined;
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ nome: novo.nome, email: novo.email, password: novo.password, perfil: novo.perfil, ativo: novo.ativo, employee }),
      });

      let payload: any = null;
      let fallbackText: string | null = null;
      try {
        payload = await res.clone().json();
      } catch {}
      if (!payload) {
        try {
          fallbackText = await res.text();
        } catch {}
      }

      if (!res.ok) {
        const msg = (payload ? errorMessage(payload) : null) || fallbackText || `${res.status} ${res.statusText}`;
        throw new Error(msg);
      }

      const data = payload ?? {};
      try {
        const overrides: UserOverride[] = Object.entries(novoOverrideMap)
          .filter(([_, v]) => v === "grant" || v === "revoke")
          .map(([permission_name, v]) => ({ permission_name, action: v as any }));
        if (data?.id) await saveUserOverrides(data.id, overrides);
      } catch (e: any) {
        toast({ title: "Aviso ao salvar exceções", description: errorMessage(e) });
      }
      await carregarUsuarios();
      setAbrirNovo(false);
      setNovo({ nome: "", email: "", password: "", perfil: "funcionario", ativo: true, nomeCompleto: "", matricula: "", cargo: "", setor: "", gestorId: "" });
      setNovoOverrideMap({});
      toast({ title: "Usuário criado", description: `${data.nome} (${data.perfil})` });
    } catch (e: any) {
      toast({ title: "Erro ao criar usuário", description: errorMessage(e) });
    }
  };

  const handleSair = () => navigate("/");

  const abrirModalEdicao = (u: Usuario) => {
    setAlvoEdicao(u);
    setEdicao({ nome: u.nome, email: u.email, perfil: u.perfil, ativo: u.ativo });
    setAbrirEditar(true);
  };

  const salvarEdicao = async () => {
    if (!alvoEdicao) return;
    const id = alvoEdicao.id;
    const patch = { nome: edicao.nome, perfil: edicao.perfil, ativo: edicao.ativo };
    const old = usuarios;
    setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
    try {
      await updateUser(id, patch);
      const overrides: UserOverride[] = Object.entries(overrideMap)
        .filter(([_, v]) => v === "grant" || v === "revoke")
        .map(([permission_name, v]) => ({ permission_name, action: v as any }));
      try {
        await saveUserOverrides(id, overrides);
      } catch (e: any) {
        toast({ title: "Aviso ao salvar exceções", description: errorMessage(e) });
      }
      setAbrirEditar(false);
      toast({ title: "Usuário atualizado", description: edicao.nome });
    } catch (e: any) {
      setUsuarios(old);
      toast({ title: "Erro ao salvar", description: errorMessage(e) });
    }
  };

  return (
    <div className="flex h-screen bg-sis-bg-light">
      <SidebarAdministrador onSair={handleSair} />
      <div className="flex flex-1 flex-col">
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            <div>
              <h1 className="mb-2 font-open-sans text-3xl font-bold text-sis-dark-text">Gerenciamento de Usuários</h1>
              <p className="font-roboto text-sm text-sis-secondary-text">Administre perfis, status de acesso e cadastre novos usuários.</p>
            </div>

            <Card className="border-sis-border bg-white">
              <CardHeader>
                <CardTitle className="text-lg">Buscar e Cadastrar</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="md:col-span-2"><Input placeholder="Buscar por nome, e-mail, ID ou perfil" value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
                <Dialog open={abrirNovo} onOpenChange={setAbrirNovo}>
                  <DialogTrigger asChild>
                    <Button className="bg-sis-blue text-white hover:bg-blue-700">+ Novo Usuário</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[640px] max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Novo Usuário</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div>
                        <Label>Nome</Label>
                        <Input value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} />
                      </div>
                      <div>
                        <Label>E-mail</Label>
                        <Input type="email" value={novo.email} onChange={(e) => setNovo({ ...novo, email: e.target.value })} />
                      </div>
                      <div>
                        <Label>Senha (mín. 6)</Label>
                        <Input type="password" value={novo.password} onChange={(e) => setNovo({ ...novo, password: e.target.value })} />
                      </div>
                      <div>
                        <Label>Perfil</Label>
                        <Select value={novo.perfil} onValueChange={(v: PerfilUsuario) => setNovo({ ...novo, perfil: v })}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="administrador">Administrador</SelectItem>
                            <SelectItem value="gestor">Gestor</SelectItem>
                            <SelectItem value="juridico">Jurídico</SelectItem>
                            <SelectItem value="funcionario">Funcionário</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {novo.perfil === "funcionario" && (
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <Label>Nome Completo</Label>
                            <Input value={novo.nomeCompleto ?? novo.nome} onChange={(e) => setNovo({ ...novo, nomeCompleto: e.target.value })} />
                          </div>
                          <div>
                            <Label>Matrícula</Label>
                            <Input value={novo.matricula ?? ""} onChange={(e) => setNovo({ ...novo, matricula: e.target.value })} />
                          </div>
                          <div>
                            <Label>Cargo</Label>
                            <Input value={novo.cargo ?? ""} onChange={(e) => setNovo({ ...novo, cargo: e.target.value })} />
                          </div>
                          <div>
                            <Label>Setor/Departamento</Label>
                            <Input value={novo.setor ?? ""} onChange={(e) => setNovo({ ...novo, setor: e.target.value })} />
                          </div>
                          <div>
                            <Label>Gestor Direto</Label>
                            <Select value={novo.gestorId ?? ""} onValueChange={(v: string) => setNovo({ ...novo, gestorId: v })}>
                              <SelectTrigger><SelectValue placeholder="Selecione o gestor" /></SelectTrigger>
                              <SelectContent>
                                {usuarios.filter((u) => u.perfil === "gestor" || u.perfil === "administrador").map((g) => (
                                  <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <Label>Ativo</Label>
                        <Switch checked={novo.ativo} onCheckedChange={(v) => setNovo({ ...novo, ativo: v })} />
                      </div>

                      <div className="mt-6 rounded-md border p-3">
                        <div className="mb-2 font-medium">Permissões herdadas do perfil</div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {allPerms.map((perm) => {
                            const inherited = (profilePerms[novo.perfil] || []).includes(perm);
                            return (
                              <label key={perm} className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={inherited} readOnly disabled />
                                <span>{perm}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mt-4 rounded-md border p-3">
                        <div className="mb-2 font-medium">Permissões individuais (exceções)</div>
                        <div className="space-y-2">
                          {allPerms.map((perm) => (
                            <div key={perm} className="flex items-center justify-between gap-4">
                              <span className="text-sm">{perm}</span>
                              <RadioGroup
                                className="grid grid-cols-3 gap-3"
                                value={novoOverrideMap[perm] ?? "default"}
                                onValueChange={(v) => setNovoOverrideMap((m) => ({ ...m, [perm]: (v as any) }))}
                              >
                                <label className="flex items-center gap-2 text-xs"><RadioGroupItem value="default" />Padrão</label>
                                <label className="flex items-center gap-2 text-xs"><RadioGroupItem value="grant" />Conceder</label>
                                <label className="flex items-center gap-2 text-xs"><RadioGroupItem value="revoke" />Revogar</label>
                              </RadioGroup>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setAbrirNovo(false)}>Cancelar</Button>
                      <Button onClick={criarUsuario} className="bg-sis-blue text-white hover:bg-blue-700">Criar</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            <div className="rounded-md border border-sis-border bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium truncate max-w-[200px]">{u.nome}</TableCell>
                      <TableCell className="whitespace-normal break-words">{u.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">{u.perfil}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm ${u.ativo ? "text-green-600" : "text-red-600"}`}>{u.ativo ? "Ativo" : "Inativo"}</span>
                          <Switch checked={u.ativo} onCheckedChange={(v) => alternarAtivo(u.id, v)} />
                        </div>
                      </TableCell>
                      <TableCell className="text-right flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => abrirModalEdicao(u)}>Editar</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtrados.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">Nenhum usuário encontrado.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <Dialog open={abrirEditar} onOpenChange={setAbrirEditar}>
              <DialogContent className="sm:max-w-[540px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Editar Usuário</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div>
                    <Label>Nome</Label>
                    <Input value={edicao.nome} onChange={(e) => setEdicao({ ...edicao, nome: e.target.value })} />
                  </div>
                  <div>
                    <Label>E-mail</Label>
                    <Input type="email" value={edicao.email} onChange={(e) => setEdicao({ ...edicao, email: e.target.value })} />
                  </div>
                  <div>
                    <Label>Perfil</Label>
                    <Select value={edicao.perfil} onValueChange={(v: PerfilUsuario) => setEdicao({ ...edicao, perfil: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="administrador">Administrador</SelectItem>
                        <SelectItem value="gestor">Gestor</SelectItem>
                        <SelectItem value="juridico">Jurídico</SelectItem>
                        <SelectItem value="funcionario">Funcionário</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Ativo</Label>
                    <Switch checked={edicao.ativo} onCheckedChange={(v) => setEdicao({ ...edicao, ativo: v })} />
                  </div>

                  <div className="mt-6 rounded-md border p-3">
                    <div className="mb-2 font-medium">Permissões herdadas do perfil</div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {allPerms.map((perm) => {
                        const inherited = (profilePerms[edicao.perfil] || []).includes(perm);
                        return (
                          <label key={perm} className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={inherited} readOnly disabled />
                            <span>{perm}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4 rounded-md border p-3">
                    <div className="mb-2 font-medium">Permissões individuais (exceções)</div>
                    <div className="space-y-2">
                      {allPerms.map((perm) => (
                        <div key={perm} className="flex items-center justify-between gap-4">
                          <span className="text-sm">{perm}</span>
                          <RadioGroup
                            className="grid grid-cols-3 gap-3"
                            value={overrideMap[perm] ?? "default"}
                            onValueChange={(v) => setOverrideMap((m) => ({ ...m, [perm]: (v as any) }))}
                          >
                            <label className="flex items-center gap-2 text-xs"><RadioGroupItem value="default" />Padrão</label>
                            <label className="flex items-center gap-2 text-xs"><RadioGroupItem value="grant" />Conceder</label>
                            <label className="flex items-center gap-2 text-xs"><RadioGroupItem value="revoke" />Revogar</label>
                          </RadioGroup>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAbrirEditar(false)}>Cancelar</Button>
                  <Button onClick={salvarEdicao} className="bg-sis-blue text-white hover:bg-blue-700">Salvar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}
