import { useEffect, useRef } from 'react';

const SIDES = { attack: 'Ataque', defense: 'Defesa' };

// O <dialog> nativo já cuida do foco e de fechar com Esc.
export default function SeriesReveal({ series, images, teams, formatLabel, onClose }) {
  const dialog = useRef(null);

  useEffect(() => {
    if (!dialog.current.open) dialog.current.showModal();
  }, []);

  return (
    <dialog
      ref={dialog}
      className="series-reveal"
      aria-label={`Mapas da série, ${formatLabel}`}
      style={{ '--count': series.length }}
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
