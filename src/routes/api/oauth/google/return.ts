import {createFileRoute} from '@tanstack/react-router';
export const Route=createFileRoute('/api/oauth/google/return')({server:{handlers:{GET:async({request})=>{
 const url=new URL(request.url); const connectorId=url.searchParams.get('connector_id') ?? ''; const code=url.searchParams.get('code') ?? ''; const success=url.searchParams.get('success')==='true' && Boolean(code);
 const result=JSON.stringify({type:success ? 'appUserConnectorOAuthComplete':'appUserConnectorOAuthFailed',connectorId,code:success ? code:null}).replace(/</g,'\\u003c');
 return new Response(`<!doctype html><html lang="pt-BR"><head><title>JARVIS — Autorização Google</title></head><body><p>${success?'Autorização concluída. Voltando ao JARVIS…':'Autorização não concluída. Feche esta janela e tente novamente.'}</p><script>if(window.opener){window.opener.postMessage(${result},window.location.origin);window.close();}</script></body></html>`,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
}}}});
