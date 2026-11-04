import { useEffect, useRef } from 'react';
import { playRevealHits } from '../sound.js';

const SIDES = { attack: 'Ataque', defense: 'Defesa' };
const CARD_FIRST_MS = 650;
const CARD_STEP_MS = 800;
// A carta acelera logo no início da entrada, então o som cai um pouco depois de ela começar.
const HIT_AFTER_CARD_MS = 100;

// O <dialog> nativo já cuida do foco e de fechar com Esc.
export default function SeriesReveal({ series, images, teams, formatLabel, onClose }) {
  const dialog = useRef(null);

  useEffect(() => {
    if (!dialog.current.open) dialog.current.showModal();
  }, []);

  const mapCount = series.length;
  useEffect(() => {
    // Sem animação, as cartas aparecem juntas: um único "TUM" basta.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const delays = reduced
      ? [0]
      : Array.from({ length: mapCount }, (_, index) => CARD_FIRST_MS + index * CARD_STEP_MS + HIT_AFTER_CARD_MS);
    return playRevealHits(delays);
  }, [mapCount]);

  return (
    <dialog
      ref={dialog}
      className="series-reveal"
      aria-label={`Mapas da série, ${formatLabel}`}
      style={{ '--count': series.length, '--card-first': `${CARD_FIRST_MS}ms`, '--card-step': `${CARD_STEP_MS}ms` }}
      onClose={onClose}
    >
      <header className="sr-head">
        <p className="fx-kicker">{formatLabel}</p>
        <h2>Mapas da série</h2>
        <button className="ghost sr-close" onClick={() => dialog.current.close()}>Fechar</button>
      </header>

      <ol className="sr-list">
        {series.map((entry, index) => (
          <li
            key={entry.map}
            className={`sr-card ${entry.decider ? 'is-decider' : ''}`}
            style={{ '--i': index }}
          >
            <picture>
              <source media="(min-width: 761px)" srcSet={images[entry.map].large} />
              <img src={images[entry.map].small} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            </picture>
            <div className="sr-info">
              <span className="sr-number">Mapa {index + 1}</span>
              <strong className="sr-map">{entry.map}</strong>
              <span className="sr-origin">
                {entry.decider ? 'Decider' : `Pick de ${teams[entry.pickedBy].name}`}
              </span>
              <div className="sr-sides">
                {['A', 'B'].map((team) => (
                  <span key={team}>
                    {teams[team].name}: <b className={`txt-${entry.sides[team]}`}>{SIDES[entry.sides[team]]}</b>
                  </span>
                ))}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </dialog>
  );
}
