import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('1. Função /api/admin/profile-permissions iniciada.');

  try {
    const supabaseUrl = process.env.SUPABASE_URL || (process.env as any).VITE_SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!supabaseUrl || !serviceKey) {
      console.error('ERRO: Variáveis de ambiente ausentes', { hasUrl: !!supabaseUrl, hasService: !!serviceKey });
      return res.status(500).json({ error: 'Configuração Supabase ausente no servidor.' });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Método não permitido' });
    }

    const authHeader = (req.headers?.authorization as string) || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    console.log('2. Token recebido:', token ? 'Sim' : 'Não');
    if (!token) return res.status(401).json({ error: 'Não autorizado.' });

    const { data: userData, error: getUserErr } = await supabaseAdmin.auth.getUser(token);
    if (getUserErr) console.error('auth.getUser error', getUserErr);
    const user = userData?.user;
    if (!user) return res.status(401).json({ error: 'Token inválido.' });

    const { data: profile, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select('perfil')
      .eq('id', user.id)
      .maybeSingle();
    if (profErr) console.error('profiles fetch error', profErr);
    console.log('3. Perfil do usuário verificado:', (profile as any)?.perfil);

    if ((profile as any)?.perfil !== 'administrador') {
      console.error('ERRO: A verificação de administrador falhou!');
      return res.status(403).json({ error: 'Acesso proibido.' });
    }

    console.log('4. Verificação de admin passou. Dados recebidos do frontend:', req.body);
    const { profile_name, permissions } = (req.body as any) || {};

    if (!profile_name || !Array.isArray(permissions)) {
      return res.status(400).json({ error: 'Dados de entrada inválidos.' });
    }

    const { data: existingPermissions, error: findError } = await supabaseAdmin
      .from('permissions')
      .select('id, name')
      .in('name', permissions);

    if (findError) throw findError;

    console.log('5. Permissões encontradas no banco:', (existingPermissions || []).map((p: any) => p.name));

    if ((existingPermissions || []).length !== permissions.length) {
      console.error('ERRO: Inconsistência de permissões!');
      return res.status(400).json({ error: 'permission not found' });
    }

    console.log('6. Validação bem-sucedida. O sistema iria salvar agora.');
    return res.status(200).json({ message: 'Validação de teste passou com sucesso!' });
  } catch (error: any) {
    console.error('ERRO INESPERADO NA FUNÇÃO:', error);
    return res.status(500).json({ error: 'Erro interno do servidor: ' + (error?.message || String(error)) });
  }
}
