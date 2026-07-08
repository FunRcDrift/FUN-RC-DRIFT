import { clearFrdSession, restoreFrdSession, saveFrdSession, supabase } from './supabase-client.js';
import { IS_CONFIGURED } from './config.js';
import { header, setStatus, calculateExperience, toast } from './common.js?v=20260708j';

header();

const loginView = document.querySelector('#loginView');
const profileView = document.querySelector('#profileView');
const loginForm = document.querySelector('#inlineLoginForm');
const profileForm = document.querySelector('#inlineProfileForm');
const loginStatus = document.querySelector('#loginStatus');
const profileStatus = document.querySelector('#profileStatus');

let user = null;
let profile = {};

function showLogin() {
  loginView.hidden = false;
  profileView.hidden = true;
  document.querySelectorAll('[data-auth]').forEach(element => element.hidden = true);
  document.querySelectorAll('[data-guest]').forEach(element => element.hidden = false);
}

async function showProfile(currentUser) {
  user = currentUser;
  loginView.hidden = true;
  profileView.hidden = false;
  document.querySelectorAll('[data-auth]').forEach(element => element.hidden = false);
  document.querySelectorAll('[data-guest]').forEach(element => element.hidden = true);

  const { data, error } = await supabase
    .from('pilotes')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) return setStatus(profileStatus, error.message, 'error');

  profile = data || {};

  if (!data) {
    profileForm.prenom.value = user.user_metadata?.prenom || '';
    profileForm.nom.value = user.user_metadata?.nom || '';
  }

  Object.entries(profile).forEach(([key, value]) => {
    const input = profileForm.elements[key];
    if (input && input.type !== 'checkbox' && input.type !== 'file') {
      input.value = value ?? '';
    }
  });

  profileForm.gz_requested.checked = !!profile.gz_requested;
  document.querySelector('#avatarPreview').src = profile.photo_url || 'assets/logo-frd.jpeg';
  document.querySelector('#experiencePreview').textContent = calculateExperience(profile.date_debut_rc_drift);

  if (data && !profile.paddock_approved) {
    setStatus(profileStatus, 'Ta carte attend la validation dâ€™un administrateur.');
  }
}

loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!IS_CONFIGURED) return setStatus(loginStatus, 'Supabase nâ€™est pas configurÃ©.', 'error');

  loginForm.classList.add('loading');
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginForm.email.value,
      password: loginForm.password.value
    });

    if (error) throw error;
    if (!data.session || !data.user) throw new Error('Connexion impossible.');

    saveFrdSession(data.session);
    await showProfile(data.user);
  } catch (error) {
    setStatus(loginStatus, error.message, 'error');
  } finally {
    loginForm.classList.remove('loading');
  }
});

async function upload(name, prefix, urlField, pathField) {
  const file = profileForm.elements[name].files[0];
  if (!file) return { [urlField]: profile[urlField] || null, [pathField]: null };
  if (file.size > 6291456) throw new Error('Chaque photo doit faire moins de 6 Mo.');
  if (!file.type.startsWith('image/')) throw new Error('Le fichier sÃ©lectionnÃ© doit Ãªtre une image.');

  const source = URL.createObjectURL(file);

  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Cette image ne peut pas Ãªtre lue.'));
      img.src = source;
    });

    const maximum = prefix === 'pilote' ? 900 : 1200;
    const ratio = Math.min(1, maximum / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);

    return { [urlField]: canvas.toDataURL('image/jpeg', 0.76), [pathField]: null };
  } finally {
    URL.revokeObjectURL(source);
  }
}

profileForm.date_debut_rc_drift.addEventListener('change', () => {
  document.querySelector('#experiencePreview').textContent = calculateExperience(profileForm.date_debut_rc_drift.value);
});

profileForm.addEventListener('submit', async event => {
  event.preventDefault();
  profileForm.classList.add('loading');

  try {
    const images = Object.assign(
      {},
      await upload('photo', 'pilote', 'photo_url', 'photo_path'),
      await upload('photo_carrosserie', 'carrosserie', 'carrosserie_url', 'carrosserie_path'),
      await upload('photo_chassis', 'chassis', 'chassis_url', 'chassis_path')
    );

    const fields = [
      'nom',
      'prenom',
      'pseudo',
      'chassis',
      'moteur',
      'esc',
      'servo',
      'gyro',
      'radio',
      'batterie',
      'pneus',
      'carrosserie',
      'date_debut_rc_drift',
      'style_pilotage',
      'objectifs'
    ];

    const payload = Object.fromEntries(
      fields.map(key => [key, profileForm.elements[key].value.trim() || null])
    );

    Object.assign(payload, images, {
      gz_requested: profileForm.gz_requested.checked
    });

    const { error } = await supabase
      .from('pilotes')
      .update(payload)
      .eq('id', user.id);

    if (error) throw error;

    profile = { ...profile, ...payload };
    document.querySelector('#avatarPreview').src = profile.photo_url || 'assets/logo-frd.jpeg';
    setStatus(profileStatus, 'Profil enregistrÃ©. Il sera visible aprÃ¨s validation par un administrateur.', 'success');
    toast('Profil mis Ã  jour');
  } catch (error) {
    setStatus(profileStatus, error.message, 'error');
  } finally {
    profileForm.classList.remove('loading');
  }
});

document.querySelector('#inlineLogout').addEventListener('click', async () => {
  clearFrdSession();
  await supabase.auth.signOut();
  user = null;
  profile = {};
  loginForm.reset();
  showLogin();
});

const session = await restoreFrdSession();
if (session?.user) await showProfile(session.user);
else showLogin();
