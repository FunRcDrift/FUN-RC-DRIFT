import { supabase } from './supabase-client.js';
import { initShell, setupNotice, calculateExperience, esc } from './common.js?v=20260708d';

const demos = [
  {id:'demo-1',pseudo:'Sideways',nom:'Martin',prenom:'Alex',chassis:'Reve D RDX',date_debut_rc_drift:'2020-06-01',gz_approved:true,photo_url:'assets/logo-frd.jpeg',carrosserie_url:null},
  {id:'demo-2',pseudo:'LeoSlide',nom:'Durand',prenom:'Léo',chassis:'Yokomo RD 2.0',date_debut_rc_drift:'2023-03-15',gz_approved:false,photo_url:'assets/logo-frd.jpeg',carrosserie_url:null},
  {id:'demo-3',pseudo:'Yellow Line',nom:'Rossi',prenom:'Nina',chassis:'MST RMX 2.5',date_debut_rc_drift:'2022-09-01',gz_approved:true,photo_url:'assets/logo-frd.jpeg',carrosserie_url:null}
];

function media(url, className, fallback){
  if(url){const img=document.createElement('img');img.className=className;img.src=url;img.alt='';img.loading='lazy';return img}
  const box=document.createElement('div');box.className=`${className} media-fallback`;box.innerHTML=`<span>${fallback}</span>`;return box;
}

function card(p){
  const link=document.createElement('a');link.className='paddock-card';link.href=`fiche-pilote.html?id=${encodeURIComponent(p.id)}`;link.setAttribute('aria-label',`Voir la fiche de ${esc(p.pseudo)||esc(p.prenom)}`);
  const visuals=document.createElement('div');visuals.className='paddock-visuals';visuals.append(media(p.photo_url,'paddock-driver',(esc(p.prenom)[0]||'F')+(esc(p.nom)[0]||'R')),media(p.carrosserie_url,'paddock-car','RC DRIFT'));
  const body=document.createElement('div');body.className='paddock-body';
  const top=document.createElement('div');top.className='paddock-top';const label=document.createElement('span');label.className='pilot-number';label.textContent='PILOTE FRD';
  if(p.gz_approved){const badge=document.createElement('img');badge.src='assets/gz-approved.svg';badge.alt='GZ Approved';badge.className='paddock-gz';top.append(label,badge)}else top.append(label);
  const pseudo=document.createElement('h2');pseudo.textContent=esc(p.pseudo)||esc(p.prenom)||'Pilote FRD';
  const first=document.createElement('p');first.className='paddock-firstname';first.textContent=esc(p.prenom);
  const details=document.createElement('div');details.className='paddock-details';details.innerHTML='<span>Châssis</span>';const chassis=document.createElement('strong');chassis.textContent=esc(p.chassis)||'À compléter';details.append(chassis);
  const exp=document.createElement('div');exp.className='paddock-exp';exp.innerHTML='<span>Expérience</span>';const value=document.createElement('strong');value.textContent=calculateExperience(p.date_debut_rc_drift);exp.append(value);
  const open=document.createElement('span');open.className='paddock-open';open.textContent='OUVRIR LA FICHE  →';
  body.append(top,pseudo,first,details,exp,open);link.append(visuals,body);return link;
}

await initShell();const page=document.querySelector('.page');setupNotice(page);const grid=document.querySelector('#pilotsGrid');let profiles=demos;
if(supabase&&!new URLSearchParams(location.search).has('demo')){const {data,error}=await supabase.from('pilotes').select('id,pseudo,nom,prenom,chassis,date_debut_rc_drift,gz_approved,photo_url,carrosserie_url').eq('paddock_approved',true).order('pseudo');if(!error)profiles=data||[];else document.querySelector('#loadStatus').textContent='Impossible de charger le paddock.'}
grid.replaceChildren();if(!profiles.length){const e=document.createElement('div');e.className='empty';e.textContent='Le paddock est encore vide.';grid.append(e)}else profiles.forEach(p=>grid.append(card(p)));
