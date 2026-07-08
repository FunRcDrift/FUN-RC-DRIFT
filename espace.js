import { supabase } from './supabase-client.js';
import { IS_CONFIGURED } from './config.js';
export const esc = value => String(value ?? '').trim();
export function calculateExperience(dateString){if(!dateString)return '—';const start=new Date(`${dateString}T00:00:00`),now=new Date();let years=now.getFullYear()-start.getFullYear();const anniversary=new Date(now.getFullYear(),start.getMonth(),start.getDate());if(now<anniversary)years--;years=Math.max(0,years);if(years===0){const months=Math.max(0,(now.getFullYear()-start.getFullYear())*12+now.getMonth()-start.getMonth());return `${months} mois`;}return `${years} an${years>1?'s':''}`;}
export function header(){const el=document.createElement('header');el.className='site-header';el.innerHTML=`<nav class="nav"><a class="brand" href="index.html"><img src="assets/logo-frd.jpeg" alt=""><span>FRD Fun RC Drift</span></a><button class="mobile-menu" aria-label="Ouvrir le menu">☰</button><div class="nav-links"><a href="pilotes.html">Pilotes</a><a href="espace-pilote.html" data-auth>Mon profil</a><a href="admin.html" data-admin hidden>Administration</a><a href="espace-pilote.html" data-guest>Connexion</a><button data-logout hidden>Déconnexion</button></div></nav>`;document.body.prepend(el);const menu=el.querySelector('.mobile-menu'),links=el.querySelector('.nav-links');menu.onclick=()=>links.classList.toggle('open');}
export function toast(message){let el=document.querySelector('.toast');if(!el){el=document.createElement('div');el.className='toast';document.body.append(el)}el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2600)}
export function setStatus(el,message,type=''){el.textContent=message;el.className=`status ${type}`;el.hidden=false}
export function setupNotice(parent){if(IS_CONFIGURED)return;const n=document.createElement('div');n.className='setup-notice';n.innerHTML='<strong>Mode aperçu</strong> — Connecte ce site à Supabase dans <code>js/config.js</code> pour activer les comptes, les profils et les photos.';parent.prepend(n)}
async function waitForAuthSession(timeout = 3000) {
  return new Promise(resolve => {
    let finished = false;
    let subscription;
    const listener = supabase.auth.onAuthStateChange((event, session) => {
      if (!finished && session && ['SIGNED_IN', 'INITIAL_SESSION', 'PASSWORD_RECOVERY'].includes(event)) {
        finished = true;
        subscription?.unsubscribe();
        resolve(session);
      }
    });
    subscription = listener.data.subscription;
    setTimeout(() => {
      if (finished) return;
      finished = true;
      subscription?.unsubscribe();
      resolve(null);
    }, timeout);
  });
}

async function resolveAuthenticatedUser() {
  let { data: { session } } = await supabase.auth.getSession();
  const code = new URLSearchParams(location.search).get('code');
  if (!session && code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      session = data.session;
      history.replaceState({}, document.title, location.pathname);
    }
  }
  const hasAuthFragment = location.hash.includes('access_token=') || location.hash.includes('type=');
  if (!session && (code || hasAuthFragment)) session = await waitForAuthSession();
  if (!session) return null;
  return session.user;
}

export async function initShell(){header();if(!supabase)return null;const user=await resolveAuthenticatedUser();document.querySelectorAll('[data-auth],[data-logout]').forEach(x=>x.hidden=!user);document.querySelectorAll('[data-guest]').forEach(x=>x.hidden=!!user);if(user){const {data:p}=await supabase.from('pilotes').select('role').eq('id',user.id).maybeSingle();document.querySelectorAll('[data-admin]').forEach(x=>x.hidden=p?.role!=='admin');document.querySelector('[data-logout]')?.addEventListener('click',async()=>{await supabase.auth.signOut();location.href='index.html'})}return user;}
