export async function aiPauseState(service: string) {
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
 const {data,error}=await supabaseAdmin.from('ai_service_state').select('paused,status,message').eq('service',service).maybeSingle();
 if(error) throw new Error('Não foi possível verificar a disponibilidade da IA.');
 return data;
}
export async function pauseAi(service:string,status:number,message:string){
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
 const {error}=await supabaseAdmin.from('ai_service_state').upsert({service,paused:true,status,message,updated_at:new Date().toISOString()});
 if(error) throw new Error('Não foi possível registrar a pausa da IA.');
}
