import "dotenv/config";
import { listProfiles } from "../server/routes/admin";

// Set env to simulate Vercel (no service role key)
process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://qkzlisreztqccjbpjszw.supabase.co";
process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_8eyoMSjZegoxTDFRp8tNGA_Y4xK84ix";
process.env.VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
// Ensure service role not present
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

// Fake JWT with payload.sub = admin id from dataset
const payload = { sub: "b0337896-0601-42bb-b8d4-62c6bb9e3e88", iat: Math.floor(Date.now()/1000) };
function base64UrlEncode(obj: any) {
  return Buffer.from(JSON.stringify(obj)).toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
}
const token = `${base64UrlEncode({alg:'none',typ:'JWT'})}.${base64UrlEncode(payload)}.`;

// Mock req/res
const req: any = { headers: { authorization: `Bearer ${token}` } };

function createRes() {
  return {
    statusCode: 200,
    headers: {} as any,
    body: null as any,
    status(code: number) { this.statusCode = code; return this; },
    json(obj: any) { this.body = obj; console.log('JSON', JSON.stringify(obj,null,2)); return this; },
    send(text: any) { this.body = text; console.log('SEND', text); return this; }
  } as any;
}

(async () => {
  const res = createRes();
  try {
    await listProfiles(req as any, res as any);
    console.log('Finished simulation with status', res.statusCode);
  } catch (e) {
    console.error('Simulation threw', e);
    process.exit(1);
  }
})();
