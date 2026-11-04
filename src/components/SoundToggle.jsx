import { useEffect, useState } from 'react';
import { isAudioUnlocked, readSoundEnabled, setSoundEnabled, unlockAudio } from '../sound.js';

export default function SoundToggle() {
  const [enabled, setEnabled] = useState(readSoundEnabled);
  const [unlocked, setUnlocked] = useState(isAudioUnlocked);

  // Quem acabou de criar a sala já clicou na página; quem abriu um link precisa clicar uma vez.
  useEffect(() => {
    let cancelled = false;
    const unlock = async () => {
      const running = await unlockAudio();
      if (!cancelled && running) setUnlocked(true);
    };
    if (navigator.userActivation?.hasBeenActive) unlock();
    window.addEventListener('click', unlock);
    return () => {
      cancelled = true;
      window.removeEventListener('click', unlock);
    };
  }, []);

  function handleClick() {
    // Com o áudio bloqueado, o clique só ativa o som; o listener acima faz a liberação.
    const next = unlocked ? !enabled : true;
    setEnabled(next);
    setSoundEnabled(next);
  }

  const on = enabled && unlocked;
  const needsActivation = enabled && !unlocked;
  let label = on ? 'Desligar som' : 'Ligar som';
  if (needsActivation) label = 'Ativar som';

  return (
    <button
      type="button"
      className={needsActivation ? 'sound-toggle needs-activation' : 'sound-toggle'}
      onClick={handleClick}
      aria-label={label}
      title={label}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 9.5v5h3.5L12 19V5L7.5 9.5H4Z" fill="currentColor" />
        {on ? <path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11" /> : <path d="M16 9.5l5 5M21 9.5l-5 5" />}
      </svg>
      {needsActivation && <span>Ativar som</span>}
    </button>
  );
}
