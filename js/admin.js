import { supabase } from './supabase-client.js';
import { IS_CONFIGURED } from './config.js';
import { initShell, setupNotice, setStatus, toast } from './common.js?v=20260708h';

const user = await initShell();
setupNotice(document.querySelector('.page'));
const status = document.querySelector('#status');
const body = document.querySelector('#adminBody');
if (IS_CONFIGURED && !user) location.href = 'connexion.html';

async function updatePilot(id, values, message) {
  const { error } = await supabase.from('pilotes').update(values).eq('id', id);
  if (error) return setStatus(status, error.message, 'error');
  toast(message);
  await load();
}

function actionButton(label, className, handler) {
  const button = document.createElement('button');
  button.className = `btn small ${className}`;
  button.type = 'button';
  button.textContent = label;
  button.onclick = handler;
  return button;
}

async function load() {
  if (!supabase) return;
  const { data: me } = await supabase.from('pilotes').select('role').eq('id', user.id).single();
  if (me?.role !== 'admin') return location.href = 'profil.html';

  const { data, error } = await supabase
    .from('pilotes')
    .select('id,prenom,nom,pseudo,paddock_approved,gz_requested,gz_approved,role,created_at')
    .order('created_at');
  if (error) return setStatus(status, error.message, 'error');

  body.replaceChildren();
  data.forEach(pilot => {
    const row = document.createElement('tr');
    const identity = document.createElement('td');
    identity.textContent = `${pilot.pseudo ? `${pilot.pseudo} â€” ` : ''}${pilot.prenom || ''} ${pilot.nom || ''}`;

    const paddock = document.createElement('td');
    paddock.append(actionButton(
      pilot.paddock_approved ? 'Retirer du paddock' : 'Accepter la carte',
      pilot.paddock_approved ? 'danger' : '',
      () => updatePilot(pilot.id, { paddock_approved: !pilot.paddock_approved }, pilot.paddock_approved ? 'Carte retirÃ©e du paddock' : 'Carte publiÃ©e dans le paddock')
    ));

    const request = document.createElement('td');
    request.textContent = pilot.gz_requested ? 'Oui' : 'Non';

    const approved = document.createElement('td');
    approved.append(actionButton(
      pilot.gz_approved ? 'Retirer GZ' : 'Valider GZ',
      'secondary',
      () => updatePilot(pilot.id, { gz_approved: !pilot.gz_approved }, 'Badge GZ mis Ã  jour')
    ));

    const role = document.createElement('td');
    role.textContent = pilot.role;

    const actions = document.createElement('td');
    actions.append(actionButton('Supprimer le compte', 'danger', async () => {
      if (!confirm(`Supprimer dÃ©finitivement le compte de ${pilot.prenom} ${pilot.nom} ?`)) return;
      const { error: deleteError } = await supabase.functions.invoke('delete-account', { body: { userId: pilot.id } });
      if (deleteError) setStatus(status, 'La fonction de suppression doit Ãªtre dÃ©ployÃ©e dans Supabase.', 'error');
      else { toast('Compte supprimÃ©'); await load(); }
    }));

    row.append(identity, paddock, request, approved, role, actions);
    body.append(row);
  });
}

load();
