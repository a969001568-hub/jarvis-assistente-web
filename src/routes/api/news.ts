import {createFileRoute} from '@tanstack/react-router';
import {readNews,NEWS_FEEDS} from '@/lib/news.server';
export const Route=createFileRoute('/api/news')({server:{handlers:{GET:async({request})=>{
 const category=new URL(request.url).searchParams.get('category')??'Geral';if(!Object.hasOwn(NEWS_FEEDS,category))return Response.json({error:'Categoria inválida.'},{status:400});
 const items=await readNews(category);return Response.json({items,updatedAt:new Date().toISOString(),error:items.length?null:'As fontes de notícias estão temporariamente indisponíveis.'},{status:items.length?200:502,headers:{'Cache-Control':items.length?'public, max-age=180':'no-store'}});
}}}});
