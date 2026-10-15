import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
export const CONNECTOR_SCOPES: Record<string, string[]> = {
 google_mail: ['https://www.googleapis.com/auth/userinfo.email','https://www.googleapis.com/auth/gmail.readonly'],
 google_drive: ['https://www.googleapis.com/auth/userinfo.email','https://www.googleapis.com/auth/drive.readonly'],
 google_docs: ['https://www.googleapis.com/auth/userinfo.email','https://www.googleapis.com/auth/documents.readonly'],
};
function cryptoKey(raw: string) { const key = Buffer.from(raw,'base64'); if (key.length !== 32) throw new Error('Configuração de segurança inválida.'); return key; }
export function encryptKey(plaintext: string, secret: string) { const iv=randomBytes(12); const cipher=createCipheriv('aes-256-gcm',cryptoKey(secret),iv); const data=Buffer.concat([cipher.update(plaintext,'utf8'),cipher.final()]); return Buffer.concat([iv,cipher.getAuthTag(),data]).toString('base64'); }
export function decryptKey(value: string, secret: string) { const data=Buffer.from(value,'base64'); const decipher=createDecipheriv('aes-256-gcm',cryptoKey(secret),data.subarray(0,12)); decipher.setAuthTag(data.subarray(12,28)); return Buffer.concat([decipher.update(data.subarray(28)),decipher.final()]).toString('utf8'); }
export async function storedKey(userId: string, connectorId: string, secret: string) { const {supabaseAdmin}=await import('@/integrations/supabase/client.server'); const {data,error}=await supabaseAdmin.from('app_user_connections').select('connection_key_ciphertext').eq('user_id',userId).eq('connector_id',connectorId).maybeSingle(); if(error) throw new Error('Não foi possível recuperar sua conexão.'); return data ? decryptKey(data.connection_key_ciphertext,secret) : null; }
export async function saveKey(userId: string, connectorId: string, value: string, secret: string) { const {supabaseAdmin}=await import('@/integrations/supabase/client.server'); const {error}=await supabaseAdmin.from('app_user_connections').upsert({user_id:userId,connector_id:connectorId,connection_key_ciphertext:encryptKey(value,secret),updated_at:new Date().toISOString()},{onConflict:'user_id,connector_id'}); if(error) throw new Error('Não foi possível salvar sua autorização.'); }
export async function googleCall(apiKey: string, connectionKey: string, connectorId: string, path: string) {
 const response=await fetch(`https://connector-gateway.lovable.dev/${connectorId}${path}`,{headers:{Authorization:`Bearer ${apiKey}`,'X-Connection-Api-Key':connectionKey,'X-Lovable-Required-Scopes':CONNECTOR_SCOPES[connectorId]?.join(' ') ?? ''}});
 if (!response.ok) { const body=await response.text(); let parsed; try { parsed=JSON.parse(body); } catch { parsed=null; } const message=parsed?.error?.message ?? parsed?.message ?? 'Falha ao acessar sua conta Google.'; if(response.status===401 && String(parsed?.type ?? '').startsWith('credential_')) throw new Error('Reconecte sua conta Google para renovar a autorização.'); throw new Error(`${message} (${response.status})`); }
 return response.json();
}
