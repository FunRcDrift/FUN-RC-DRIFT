import { supabase } from './supabase-client.js';
import { SITE_URL, IS_CONFIGURED } from './config.js';
import { initShell, setupNotice, setStatus } from './common.js?v=20260708j';

const form = document.querySelector('form');
const status = document.querySelector('#status');
let recoveryReady = form?.id !== 'passwordForm';

function friendlyAuthMessage(error) {
  const message = String(error?.message || '').toLowerCase();
  if (message.includes('email rate limit exceeded')) {
    return 'Trop dâ€™emails ont Ã©tÃ© demandÃ©s. Supabase limite temporairement les envois : attends environ une heure avant de rÃ©essayer.';
  }
  if (message.includes('email address not authorized')) {
    return 'Cette adresse ne peut pas recevoir dâ€™email tant que le service SMTP du site nâ€™est pas configurÃ©.';
  }
  if (message.includes('email not confirmed')) {
    return 'Ton email nâ€™est pas encore confirmÃ©. Ouvre le dernier email reÃ§u et clique sur le lien de validation.';
  }
  if (message.includes('invalid login credentials')) {
    return 'Email ou mot de passe incorrect.';
  }
  return error?.message || 'Une erreur est survenue.';
}

const currentUser = await initShell();
setupNotice(document.querySelector('main'));

if (currentUser && ['signupForm', 'loginForm', 'resetForm'].includes(form?.id)) {
  location.replace('espace-pilote.html');
}

function lockPasswordForm(locked) {
  if (!form || form.id !== 'passwordForm') return;
  form.querySelectorAll('input, button').forEach(element => element.disabled = locked);
  form.classList.toggle('loading', locked);
}

async function waitForRecoveryEvent(timeout = 4000) {
  return new Promise(resolve => {
    let finished = false;
    let subscription;
    const listener = supabase.auth.onAuthStateChange((event, session) => {
      if (!finished && session && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN')) {
        finished = true;
        subscription?.unsubscribe();
        resolve(session);
      }
    });
    subscription = listener.data.subscription;
    setTimeout(() => {
      if (finished) return;
      finished = true;
      subscription.unsubscribe();
      resolve(null);
    }, timeout);
  });
}

async function preparePasswordRecovery() {
  if (!form || form.id !== 'passwordForm' || !supabase) return;
  lockPasswordForm(true);
  setStatus(status, 'VÃ©rification du lien sÃ©curisÃ©â€¦');

  try {
    let { data: { session } } = await supabase.auth.getSession();
    const code = new URLSearchParams(location.search).get('code');

    if (!session && code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
      session = data.session;
      history.replaceState({}, document.title, location.pathname);
    }

    if (!session) session = await waitForRecoveryEvent();
    if (!session) throw new Error('Ce lien est invalide, expirÃ© ou a dÃ©jÃ  Ã©tÃ© utilisÃ©. Demande un nouvel email de rÃ©cupÃ©ration.');

    recoveryReady = true;
    status.hidden = true;
    lockPasswordForm(false);
    form.password.focus();
  } catch (error) {
    recoveryReady = false;
    lockPasswordForm(true);
    setStatus(status, error.message, 'error');
  }
}

await preparePasswordRecovery();

form?.addEventListener('submit', async event => {
  event.preventDefault();
  if (!IS_CONFIGURED) return setStatus(status, 'Configure Supabase avant dâ€™utiliser les comptes.', 'error');
  form.classList.add('loading');

  try {
    if (form.id === 'signupForm') {
      const email = form.email.value;
      const password = form.password.value;
      if (password.length < 8) throw new Error('Le mot de passe doit contenir au moins 8 caractÃ¨res.');
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${SITE_URL}/espace-pilote.html`,
          data: { nom: form.nom.value, prenom: form.prenom.value }
        }
      });
      if (error) throw error;
      setStatus(status, 'Compte crÃ©Ã©. VÃ©rifie ta boÃ®te email pour confirmer ton inscription.', 'success');
      form.reset();
    }

    if (form.id === 'loginForm') {
      const { data, error } = await supabase.auth.signInWithPassword({ email: form.email.value, password: form.password.value });
      if (error) throw error;
      if (!data.session) throw new Error('La session nâ€™a pas pu Ãªtre crÃ©Ã©e. Recharge la page et rÃ©essaie.');
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      });
      if (sessionError) throw sessionError;
      const { data: storedSession } = await supabase.auth.getSession();
      if (!storedSession.session) throw new Error('Le navigateur nâ€™a pas pu enregistrer la session. Autorise le stockage du site puis rÃ©essaie.');
      setStatus(status, 'Connexion rÃ©ussie. Ouverture de ton profilâ€¦', 'success');
      setTimeout(() => location.replace(new URL('espace-pilote.html', location.href).href), 500);
    }

    if (form.id === 'resetForm') {
      const { error } = await supabase.auth.resetPasswordForEmail(form.email.value, {
        redirectTo: `${SITE_URL}/nouveau-mot-de-passe.html`
      });
      if (error) throw error;
      setStatus(status, 'Email de rÃ©cupÃ©ration envoyÃ©. Utilise uniquement le lien du dernier email reÃ§u.', 'success');
    }

    if (form.id === 'passwordForm') {
      if (!recoveryReady) throw new Error('Ouvre cette page depuis le lien reÃ§u par email.');
      if (form.password.value.length < 8) throw new Error('Le mot de passe doit contenir au moins 8 caractÃ¨res.');
      if (form.password.value !== form.confirmPassword.value) throw new Error('Les deux mots de passe ne correspondent pas.');
      const { error } = await supabase.auth.updateUser({ password: form.password.value });
      if (error) throw error;
      setStatus(status, 'Mot de passe mis Ã  jour. Redirection vers la connexionâ€¦', 'success');
      form.reset();
      await supabase.auth.signOut();
      setTimeout(() => location.href = 'espace-pilote.html', 1600);
    }
  } catch (error) {
    setStatus(status, friendlyAuthMessage(error), 'error');
  } finally {
    form.classList.remove('loading');
  }
});
