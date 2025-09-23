import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // --- Método permitido ---
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Método não permitido' });
    }

    // --- Autenticação e Autorização ---
    const supabaseUrl = process.env.SUPABASE_URL || (process.env as any).VITE_SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !serviceKey) {
      console.error('[ERRO VERCEL] Variáveis de ambiente ausentes', {
        hasUrl: !!supabaseUrl,
        hasService: !!serviceKey,
      });
      return res.status(500).json({ error: 'Configuração Supabase ausente no servidor.' });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const authHeader = (req.headers?.authorization as string) || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    if (!token) return res.status(401).json({ error: 'Não autorizado.' });

    const { data: userData, error: getUserErr } = await supabaseAdmin.auth.getUser(token);
    if (getUserErr) console.error('[ERRO VERCEL] auth.getUser', getUserErr);
    const user = userData?.user;
    if (!user) return res.status(401).json({ error: 'Token inválido.' });

    const { data: profile, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select('perfil')
      .eq('id', user.id)
      .single();
    if (profErr) {
      console.error('[ERRO VERCEL] profiles fetch', profErr);
      return res.status(500).json({ error: 'Falha ao carregar perfil do usuário.' });
    }

    if ((profile as any)?.perfil !== 'administrador') {
      console.error('[ERRO VERCEL] Acesso proibido. Perfil:', (profile as any)?.perfil);
      return res.status(403).json({ error: 'Acesso proibido.' });
    }

    // --- Lógica de Negócio ---
    const body = (req.body as any) || {};
    const profile_name: string | undefined = body.profile_name;
    const permissionsFromFrontend: string[] = Array.isArray(body.permissions) ? body.permissions : [];

    console.log(`[LOG VERCEL] Recebido para o perfil '${profile_name}':`, permissionsFromFrontend);

    if (!profile_name || !Array.isArray(permissionsFromFrontend)) {
      return res.status(400).json({ error: 'Dados de entrada inválidos.' });
    }

    // Se não houver permissões, apenas limpe e saia.
    if (permissionsFromFrontend.length === 0) {
      const { error: delErr } = await supabaseAdmin
        .from('profile_permissions')
        .delete()
        .eq('profile_name', profile_name);
      if (delErr) {
        console.error('[ERRO VERCEL] Falha ao limpar permissões:', delErr);
        return res.status(500).json({ error: 'Falha ao limpar permissões.' });
      }
      return res.status(200).json({ message: 'Permissões limpas com sucesso.' });
    }

    // Validação: Verifica se todas as permissões enviadas existem no banco
    const { data: permissionsFromDb, error: findError } = await supabaseAdmin
      .from('permissions')
      .select('id, name')
      .in('name', permissionsFromFrontend);

    if (findError) {
      console.error('[ERRO VERCEL] Falha ao buscar permissões:', findError);
      return res.status(500).json({ error: 'Falha ao validar permissões.' });
    }

    const foundNames = (permissionsFromDb || []).map((p: any) => p.name);
    console.log('[LOG VERCEL] Permissões encontradas no banco:', foundNames);

    if (foundNames.length !== permissionsFromFrontend.length) {
      const missingPermission = permissionsFromFrontend.find((p) => !foundNames.includes(p));
      console.error(`[ERRO VERCEL] A permissão '${missingPermission}' enviada pelo frontend não foi encontrada no banco!`);
      return res.status(400).json({ error: `permission not found: ${missingPermission}` });
    }

    // --- Salvando no Banco de Dados ---
    const permissionIds = (permissionsFromDb || []).map((p: any) => p.id);

    // Deleta as permissões antigas
    const { error: delOldErr } = await supabaseAdmin
      .from('profile_permissions')
      .delete()
      .eq('profile_name', profile_name);
    if (delOldErr) {
      console.error('[ERRO VERCEL] Falha ao deletar permissões antigas:', delOldErr);
      return res.status(500).json({ error: 'Falha ao atualizar permissões (delete).' });
    }

    // Insere as novas
    const newProfilePermissions = permissionIds.map((id: string | number) => ({
      profile_name,
      permission_id: id,
    }));

    const { error: insertErr } = await supabaseAdmin
      .from('profile_permissions')
      .insert(newProfilePermissions);
    if (insertErr) {
      console.error('[ERRO VERCEL] Falha ao inserir novas permissões:', insertErr);
      return res.status(500).json({ error: 'Falha ao atualizar permissões (insert).' });
    }

    return res.status(200).json({ message: 'Permissões atualizadas com sucesso!' });
  } catch (error: any) {
    console.error('[ERRO FATAL NA FUNÇÃO VERCEL]', error);
    return res.status(500).json({ error: 'Erro interno do servidor: ' + (error?.message || String(error)) });
  }
}
