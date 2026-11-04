import { useEffect, useState } from 'react';
import introImage from '../assets/room-intro.jpg';

const DURATION_MS = 2400;
// Se a imagem demorar, a organização vai direto para a sala em vez de esperar numa tela vazia.
const MAX_LOAD_WAIT_MS = 1500;

export const preloadRoomIntro = () => {
  new Image().src = introImage;
};

// Abertura exibida só para quem acabou de criar a sala. Qualquer clique ou tecla pula.
export default function RoomIntro({ onDone }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onDone();
      return undefined;
    }
    let cancelled = false;
    const giveUp = setTimeout(onDone, MAX_LOAD_WAIT_MS);
    const image = new Image();
    image.src = introImage;
    image.decode().then(
      () => {
        clearTimeout(giveUp);
        if (!cancelled) setReady(true);
      },
      () => { if (!cancelled) onDone(); },
    );
    return () => {
      cancelled = true;
      clearTimeout(giveUp);
    };
  }, [onDone]);

  useEffect(() => {
    if (!ready) return undefined;
    const timer = setTimeout(onDone, DURATION_MS);
    window.addEventListener('keydown', onDone);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onDone);
    };
  }, [ready, onDone]);

  return (
    <div
      className={ready ? 'intro is-playing' : 'intro'}
      style={{ '--intro-duration': `${DURATION_MS}ms` }}
      onClick={onDone}
      aria-hidden="true"
      data-testid="room-intro"
    >
      {ready && (
        <div className="intro-stage">
          <img className="intro-img intro-half intro-half-left" src={introImage} alt="" />
          <img className="intro-img intro-half intro-half-right" src={introImage} alt="" />
          {/* A imagem inteira cobre a emenda entre as metades assim que elas se encontram. */}
          <img className="intro-img intro-whole" src={introImage} alt="" />
          <svg className="intro-slash" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line x1="64" y1="0" x2="52" y2="100" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
      )}
    </div>
  );
}
