import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'}
Deno.serve(async req => {
  if(req.method === 'OPTIONS') return new Response('ok',{headers:cors})
  try {
    const authHeader=req.headers.get('Authorization');
    if(!authHeader) throw new Error('Session requise')
    const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const callerClient=createClient(url,anon,{global:{headers:{Authorization:authHeader}}});
    const {data:{user:caller}}=await callerClient.auth.getUser();
    if(!caller) throw new Error('Session invalide')
    const {userId}=await req.json();
    const {data:me}=await callerClient.from('pilotes').select('role').eq('id',caller.id).single();
    if(userId!==caller.id && me?.role!=='admin') throw new Error('Action interdite')
    const admin=createClient(url,service);
    const {data:target}=await admin.from('pilotes').select('photo_path,carrosserie_path,chassis_path').eq('id',userId).maybeSingle();
    const photos=[target?.photo_path,target?.carrosserie_path,target?.chassis_path].filter(Boolean);
    if(photos.length) await admin.storage.from('avatars').remove(photos);
    const {error}=await admin.auth.admin.deleteUser(userId);
    if(error) throw error
    return new Response(JSON.stringify({ok:true}),{headers:{...cors,'Content-Type':'application/json'}})
  } catch(error) {
    return new Response(JSON.stringify({error:error.message}),{status:400,headers:{...cors,'Content-Type':'application/json'}})
  }
})
