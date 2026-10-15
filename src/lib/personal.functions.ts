import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
const connector = z.enum(['google_mail','google_drive','google_docs']);
const input = z.object({ connectorId: connector });
export const connectionStatus = createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
 const {data,error}=await supabaseAdmin.from('app_user_connections').select('connector_id').eq('user_id',context.userId);
 if(error) throw new Error('Não foi possível verificar suas conexões.');
 return (data ?? []).map((d)=>d.connector_id);
});
export const startPersonalConnection = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((data:unknown)=>input.parse(data)).handler(async({data,context})=>{
 const apiKey=process.env['LOVABLE_API_KEY']; const secret=process.env['APP_USER_CONNECTION_KEY_SECRET'];
 const clientKey= data.connectorId==='google_mail' ? process.env['GOOGLE_MAIL_APP_USER_CONNECTOR_CLIENT_API_KEY'] : data.connectorId==='google_drive' ? process.env['GOOGLE_DRIVE_APP_USER_CONNECTOR_CLIENT_API_KEY'] : process.env['GOOGLE_DOCS_APP_USER_CONNECTOR_CLIENT_API_KEY'];
 if(!apiKey || !secret || !clientKey) throw new Error('Conexão Google ainda não configurada.');
 const {storedKey,CONNECTOR_SCOPES}=await import('./google-connectors.server');
 const key=await storedKey(context.userId,data.connectorId,secret);
 const request=getRequest(); const url=new URL(request.url); const forwarded=url.hostname==='localhost' ? request.headers.get('x-forwarded-host') : null;
 const returnUrl=new URL('/api/oauth/google/return',forwarded ? `https://${forwarded}` : url.origin).toString();
 const headers:Record<string,string>={Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json','X-Client-Api-Key':clientKey}; if(key) headers['X-Connection-Api-Key']=key;
 const response=await fetch('https://connector-gateway.lovable.dev/api/v1/app-users/oauth2/authorize',{method:'POST',headers,body:JSON.stringify({connector_id:data.connectorId,app_user_id:context.userId,return_url:returnUrl,credentials_configuration:{scopes:CONNECTOR_SCOPES[data.connectorId]}})});
 if(!response.ok) throw new Error(`Não foi possível iniciar a autorização Google (${response.status}).`);
 const body=await response.json(); if(typeof body.authorization_url!=='string') throw new Error('Google não retornou uma autorização válida.'); return {authorizationUrl:body.authorization_url};
});
export const finishPersonalConnection = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((data:unknown)=>z.object({connectorId:connector,code:z.string().min(1).max(4096)}).parse(data)).handler(async({data,context})=>{
 const apiKey=process.env['LOVABLE_API_KEY']; const secret=process.env['APP_USER_CONNECTION_KEY_SECRET']; if(!apiKey || !secret) throw new Error('Conexão Google não configurada.');
 const response=await fetch('https://connector-gateway.lovable.dev/api/v1/app-users/oauth2/exchange',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({code:data.code})});
 if(!response.ok) throw new Error(`Não foi possível concluir a autorização (${response.status}).`);
 const body=await response.json(); if(body.connector_id!==data.connectorId || typeof body.api_key!=='string') throw new Error('Autorização Google inválida.');
 const {saveKey}=await import('./google-connectors.server'); await saveKey(context.userId,data.connectorId,body.api_key,secret); return {ok:true};
});
export const readPersonalData = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((data:unknown)=>z.object({connectorId:connector,documentId:z.string().regex(/^[a-zA-Z0-9_-]{10,200}$/).optional()}).parse(data)).handler(async({data,context})=>{
 const apiKey=process.env['LOVABLE_API_KEY']; const secret=process.env['APP_USER_CONNECTION_KEY_SECRET']; if(!apiKey || !secret) throw new Error('Conexão Google não configurada.');
 const {storedKey,googleCall}=await import('./google-connectors.server'); const key=await storedKey(context.userId,data.connectorId,secret); if(!key) throw new Error('Conecte esta conta Google primeiro.');
 if(data.connectorId==='google_mail') {
  const list=await googleCall(apiKey,key,data.connectorId,'/gmail/v1/users/me/messages?maxResults=5&q=in%3Ainbox');
  // Only five visible rows. Metadata only; never mark emails read automatically.
  const rows=await Promise.all((list.messages ?? []).slice(0,5).map(async(m:{id:string})=>{
   const mail=await googleCall(apiKey,key,data.connectorId,`/gmail/v1/users/me/messages/${encodeURIComponent(m.id)}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`);
   const header=(name:string)=>mail.payload?.headers?.find((h:{name:string})=>h.name.toLowerCase()===name.toLowerCase())?.value ?? '';
   return {id:m.id,title:header('Subject'),detail:header('From'),text:mail.snippet ?? '',url:`https://mail.google.com/mail/u/0/#inbox/${m.id}`};
  })); return {rows};
 }
 if(data.connectorId==='google_drive') {const list=await googleCall(apiKey,key,data.connectorId,'/drive/v3/files?pageSize=10&orderBy=modifiedTime%20desc&fields=files(id,name,mimeType,webViewLink)&q=trashed%3Dfalse');return {rows:(list.files ?? []).map((f:{id:string;name:string;mimeType:string;webViewLink?:string})=>({id:f.id,title:f.name,detail:f.mimeType,text:'',url:f.webViewLink ?? ''}))};}
 if(!data.documentId) throw new Error('Informe o link de um documento para ler seu conteúdo.');
 const doc=await googleCall(apiKey,key,data.connectorId,`/v1/documents/${data.documentId}?includeTabsContent=true`);
 const text=(parts:any[]):string=>parts.map((p)=>p.paragraph?.elements?.map((e:any)=>e.textRun?.content ?? '').join('') ?? (p.table?.tableRows?.map((r:any)=>r.tableCells?.map((c:any)=>text(c.content ?? [])).join(' ')).join('\n') ?? '')).join('\n');
 const tabText=(tabs:any[]):string=>tabs.map((t)=>text(t.documentTab?.body?.content ?? [])+'\n'+tabText(t.childTabs ?? [])).join('\n');
 return {rows:[{id:data.documentId,title:doc.title ?? 'Documento',detail:'Google Docs',text:(doc.tabs ? tabText(doc.tabs) : text(doc.body?.content ?? [])).slice(0,20000),url:`https://docs.google.com/document/d/${data.documentId}/edit`}]};
});
