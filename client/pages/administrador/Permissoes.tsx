import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchAvailablePermissions,
  fetchProfilePermissions,
  setProfilePermission,
  fetchUsers,
  fetchUserPermissions,
  setUserPermission,
  type PerfilUsuario,
} from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SidebarAdministrador from "@/components/SidebarAdministrador";

const PERFIS: PerfilUsuario[] = ["administrador", "gestor", "juridico", "funcionario"];

export default function PermissoesAdminPage() {
  const qc = useQueryClient();
  const { data: permissions } = useQuery({ queryKey: ["admin-permissions"], queryFn: fetchAvailablePermissions });
  const { data: profileMap } = useQuery({ queryKey: ["admin-profile-permissions"], queryFn: fetchProfilePermissions });
  const { data: usuarios } = useQuery({ queryKey: ["usuarios"], queryFn: fetchUsers });

  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const { data: userPerms } = useQuery({
    queryKey: ["user-perms", selectedUserId],
    queryFn: () => fetchUserPermissions(selectedUserId),
    enabled: selectedUserId !== "",
  });

  const toggleProfilePerm = useMutation({
    mutationFn: async (vars: { perfil: PerfilUsuario; permission: string; enabled: boolean }) => {
      await setProfilePermission(vars.perfil, vars.permission, vars.enabled);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-profile-permissions"] });
    },
  });

  const toggleUserPerm = useMutation({
    mutationFn: async (vars: { userId: string; permission: string; enabled: boolean }) => {
      await setUserPermission(vars.userId, vars.permission, vars.enabled);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["user-perms", vars.userId] });
    },
  });

  const permissionsList = permissions || [];
  const currentProfileMap = profileMap || {};

  const userOptions = useMemo(() => (usuarios || []).map((u) => ({ id: u.id, label: u.nome || u.email || u.id })), [usuarios]);

  return (
    <div className="flex min-h-screen bg-sis-bg-light">
      <SidebarAdministrador />
      <main className="flex-1 p-4 md:p-6 space-y-6">
        <div>
          <h1 className="font-open-sans text-2xl font-bold text-sis-dark-text">Permissões</h1>
          <p className="text-sis-secondary-text">Administre permissões por perfil ou por usuário.</p>
        </div>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="p-4 md:p-6">
            <h2 className="mb-4 font-roboto text-lg font-semibold">Por Perfil</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {PERFIS.map((perfil) => (
                <div key={perfil} className="rounded-md border p-3">
                  <div className="mb-2 font-medium capitalize">{perfil}</div>
                  <div className="space-y-2">
                    {permissionsList.map((perm) => {
                      const enabled = (currentProfileMap[perfil] || []).includes(perm);
                      return (
                        <div key={perm} className="flex items-center justify-between">
                          <Label className="mr-3 text-sm">{perm}</Label>
                          <Checkbox
                            checked={enabled}
                            onCheckedChange={(v: any) =>
                              toggleProfilePerm.mutate({ perfil, permission: perm, enabled: !!v })
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4 md:p-6">
            <h2 className="mb-4 font-roboto text-lg font-semibold">Por Usuário</h2>
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3 md:items-center">
              <Label className="text-sm">Selecione o usuário</Label>
              <div className="md:col-span-2">
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Escolha um usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    {userOptions.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedUserId && (
              <div className="space-y-2">
                {permissionsList.map((perm) => {
                  const enabled = (userPerms || []).includes(perm);
                  return (
                    <div key={perm} className="flex items-center justify-between">
                      <Label className="mr-3 text-sm">{perm}</Label>
                      <Checkbox
                        checked={enabled}
                        onCheckedChange={(v: any) =>
                          toggleUserPerm.mutate({ userId: selectedUserId, permission: perm, enabled: !!v })
                        }
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </section>
      </main>
    </div>
  );
}
