const SIDES = { attack: 'Ataque', defense: 'Defesa' };

function originText(entry, nameOf) {
  const chooser = nameOf(entry.sideChosenBy);
  return entry.decider
    ? `Decider · lado escolhido por ${chooser}`
    : `Pick de ${nameOf(entry.pickedBy)} · lado escolhido por ${chooser}`;
}

export default function FinalSummary({ veto, images, nameOf, formatLabel, onReplay, children }) {
  const bans = veto.maps.filter((map) => map.status === 'banned');

  return (
    <section className="summary" aria-labelledby="summary-title">
      <header className="summary-head">
        <div>
          <p className="summary-format">{formatLabel}</p>
          <h2 id="summary-title">Resumo da série</h2>
        </div>
        <button className="ghost" onClick={onReplay}>Ver mapas da série</button>
      </header>

      <ol className="summary-list">
        {veto.series.map((entry, index) => (
          <li key={entry.map} className={`summary-row ${entry.decider ? 'is-decider' : ''}`}>
            <div className="summary-map">
              <picture>
                <source media="(min-width: 761px)" srcSet={images[entry.map].large} />
                <img src={images[entry.map].small} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              </picture>
              <span className="summary-number" aria-label={`Mapa ${index + 1}`}>{index + 1}</span>
              <div className="summary-name">
                <strong>{entry.map}</strong>
                <small>{originText(entry, nameOf)}</small>
              </div>
            </div>
            {['A', 'B'].map((team) => (
              <div key={team} className={`summary-side side-${entry.sides[team]}`}>
                <span>{nameOf(team)}</span>
                <b>{SIDES[entry.sides[team]]}</b>
              </div>
            ))}
          </li>
        ))}
      </ol>

      <div className="summary-bans">
        <h3>Banidos</h3>
        <ul>
          {bans.map((map) => (
            <li key={map.name}>
              <img src={images[map.name].small} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              <div>
                <b>{map.name}</b>
                <small>por {nameOf(map.by)}</small>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <details className="summary-details">
        <summary>Ver sequência completa do veto</summary>
        {children}
      </details>
    </section>
  );
}
