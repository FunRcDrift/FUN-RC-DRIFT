import { supabase } from './supabase-client.js';
import { SITE_URL, IS_CONFIGURED } from './config.js';
import { initShell, setupNotice, setStatus } from './common.js';

const form = document.querySelector('form');
const status = document.querySelector('#status');
let recoveryReady = form?.id !== 'passwordForm';

await initShell();
setupNotice(document.querySelector('main'));

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
  setStatus(status, 'Vérification du lien sécurisé…');

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
    if (!session) throw new Error('Ce lien est invalide, expiré ou a déjà été utilisé. Demande un nouvel email de récupération.');

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
  if (!IS_CONFIGURED) return setStatus(status, 'Configure Supabase avant d’utiliser les comptes.', 'error');
  form.classList.add('loading');

  try {
    if (form.id === 'signupForm') {
      const email = form.email.value;
      const password = form.password.value;
      if (password.length < 8) throw new Error('Le mot de passe doit contenir au moins 8 caractères.');
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${SITE_URL}/profil.html`,
          data: { nom: form.nom.value, prenom: form.prenom.value }
        }
      });
      if (error) throw error;
      setStatus(status, 'Compte créé. Vérifie ta boîte email pour confirmer ton inscription.', 'success');
      form.reset();
    }

    if (form.id === 'loginForm') {
      const { error } = await supabase.auth.signInWithPassword({ email: form.email.value, password: form.password.value });
      if (error) throw error;
      location.href = 'profil.html';
    }

    if (form.id === 'resetForm') {
      const { error } = await supabase.auth.resetPasswordForEmail(form.email.value, {
        redirectTo: `${SITE_URL}/nouveau-mot-de-passe.html`
      });
      if (error) throw error;
      setStatus(status, 'Email de récupération envoyé. Utilise uniquement le lien du dernier email reçu.', 'success');
    }

    if (form.id === 'passwordForm') {
      if (!recoveryReady) throw new Error('Ouvre cette page depuis le lien reçu par email.');
      if (form.password.value.length < 8) throw new Error('Le mot de passe doit contenir au moins 8 caractères.');
      if (form.password.value !== form.confirmPassword.value) throw new Error('Les deux mots de passe ne correspondent pas.');
      const { error } = await supabase.auth.updateUser({ password: form.password.value });
      if (error) throw error;
      setStatus(status, 'Mot de passe mis à jour. Redirection vers la connexion…', 'success');
      form.reset();
      await supabase.auth.signOut();
      setTimeout(() => location.href = 'connexion.html', 1600);
    }
  } catch (error) {
    setStatus(status, error.message || 'Une erreur est survenue.', 'error');
  } finally {
    form.classList.remove('loading');
  }
});
