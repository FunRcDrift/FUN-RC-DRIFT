import { supabase } from './supabase-client.js';
import { IS_CONFIGURED } from './config.js';
import { initShell, setupNotice, setStatus, toast } from './common.js?v=20260708j';

const user = await initShell();
setupNotice(document.querySelector('.page'));

const status = document.querySelector('#status');
const body = document.querySelector('#adminBody');

if (IS_CONFIGURED && !user) {
  location.href = 'espace-pilote.html';
}

function button(label, className, onClick) {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = `btn small ${className}`;
  element.textContent = label;
  element.onclick = onClick;
  return element;
}

async function setPaddockStatus(id, accepted) {
  const { error } = await supabase
    .from('pilotes')
    .update({ paddock_approved: accepted })
    .eq('id', id);

  if (error) return setStatus(status, error.message, 'error');

  toast(accepted ? 'Carte acceptÃ©e dans le paddock' : 'Carte refusÃ©e / retirÃ©e du paddock');
  await load();
}

async function load() {
  if (!supabase || !user) return;

  const { data: me, error: meError } = await supabase
    .from('pilotes')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (meError) return setStatus(status, meError.message, 'error');

  const isAdmin = me?.role === 'admin' || user.email?.toLowerCase() === 'alexandrelion364@gmail.com';
  if (!isAdmin) {
    setStatus(status, 'AccÃ¨s rÃ©servÃ© Ã  lâ€™admin FRD.', 'error');
    return;
  }

  const { data, error } = await supabase
    .from('pilotes')
    .select('id,nom,prenom,paddock_approved,created_at')
    .order('created_at', { ascending: false });

  if (error) return setStatus(status, error.message, 'error');

  body.replaceChildren();

  if (!data?.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 4;
    cell.textContent = 'Aucun pilote pour le moment.';
    row.append(cell);
    body.append(row);
    return;
  }

  data.forEach(pilot => {
    const row = document.createElement('tr');

    const nom = document.createElement('td');
    nom.textContent = pilot.nom || 'â€”';

    const prenom = document.createElement('td');
    prenom.textContent = pilot.prenom || 'â€”';

    const accept = document.createElement('td');
    accept.append(button(
      pilot.paddock_approved ? 'AcceptÃ©' : 'Accepter',
      pilot.paddock_approved ? 'secondary' : '',
      () => setPaddockStatus(pilot.id, true)
    ));

    const refuse = document.createElement('td');
    refuse.append(button(
      pilot.paddock_approved ? 'Refuser' : 'RefusÃ©',
      'danger',
      () => setPaddockStatus(pilot.id, false)
    ));

    row.append(nom, prenom, accept, refuse);
    body.append(row);
  });
}

load();
