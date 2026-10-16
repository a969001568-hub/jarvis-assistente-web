// Read only known public publishers; arbitrary URLs, private addresses, redirects
// and user credentials are never fetched by this helper.
const publishers=new Set(['g1.globo.com','ge.globo.com','agenciabrasil.ebc.com.br']);
export async function readPublicArticle(url:string):Promise<string>{
 let parsed:URL;try{parsed=new URL(url);}catch{return '';}
 if(parsed.protocol!=='https:'||parsed.port||parsed.username||parsed.password||!publishers.has(parsed.hostname))return '';
 try{const response=await fetch(parsed,{redirect:'error',headers:{'User-Agent':'Mozilla/5.0','Accept':'text/html'},signal:AbortSignal.timeout(6000)});if(!response.ok||!response.headers.get('content-type')?.includes('text/html')||!response.body)return '';
 const reader=response.body.getReader();const decoder=new TextDecoder();let text='';let bytes=0;
 try{for(;;){const part=await reader.read();if(part.done)break;bytes+=part.value.length;if(bytes>500000)break;text+=decoder.decode(part.value,{stream:true});}}finally{await reader.cancel();}
 return text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&amp;/g,' ').replace(/\s+/g,' ').trim().slice(0,8000);
 }catch{return '';}
}
