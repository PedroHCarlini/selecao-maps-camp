const STEP_LABEL = { ban: 'Ban', pick: 'Pick', side: 'Lado', decider: 'Decider' };

const LEGEND = [
  { type: 'ban', text: 'Tira o mapa da disputa.' },
  { type: 'pick', text: 'Coloca o mapa na série.' },
  { type: 'side', text: 'Define quem começa no ataque e na defesa do mapa.' },
  { type: 'decider', text: 'O mapa que sobrar fecha a série.' },
];

// Agrupa pela leitura do jogador: os bans seguidos e cada mapa com a escolha de lado dele.
function groupSteps(steps) {
  const groups = [];
  let mapNumber = 0;
  steps.forEach((step, index) => {
    const item = { ...step, order: index + 1 };
    const last = groups.at(-1);
    if (step.type === 'side') {
      last.steps.push(item);
    } else if (step.type === 'ban' && last?.kind === 'bans') {
      last.steps.push(item);
    } else if (step.type === 'ban') {
      groups.push({ kind: 'bans', title: 'Bans', steps: [item] });
    } else {
      mapNumber += 1;
      groups.push({ kind: 'map', title: `Mapa ${mapNumber}`, steps: [item] });
    }
  });
  return groups;
}

function StepIcon({ type }) {
  return (
    <svg className="step-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      {type === 'ban' && <path d="M5 5l14 14M19 5L5 19" fill="none" stroke="currentColor" strokeWidth="3.5" />}
      {type === 'pick' && <path d="M4 12.5l5.5 5.5L20 6.5" fill="none" stroke="currentColor" strokeWidth="3.5" />}
      {type === 'side' && (
        <>
          <path d="M3 3h18L3 21z" fill="var(--red)" />
          <path d="M21 3v18H3z" fill="var(--teal)" />
        </>
      )}
      {type === 'decider' && <path d="M12 2l10 10-10 10L2 12z" fill="currentColor" />}
    </svg>
  );
}

export default function VetoRail({ steps, teamNames }) {
  const groups = groupSteps(steps);

  return (
    <div className="rail-block">
      <div className="rail">
        <div className="rail-lanes" aria-hidden="true">
          <span>{teamNames.A}</span>
          <span>{teamNames.B}</span>
        </div>
        <ol className="rail-groups">
          {groups.map((group) => (
            <li key={group.steps[0].order} className="rail-group" style={{ '--n': group.steps.length }}>
              <p className="rail-group-title">{group.title}</p>
              <ol className="rail-steps">
                {group.steps.map((step, position) => (
                  <li
                    key={step.order}
                    className={`rail-token token-${step.type}`}
                    style={{
                      '--col': position + 1,
                      '--row': step.team === 'B' ? 2 : 1,
                      '--span': step.team ? 1 : 2,
                      '--i': step.order,
                    }}
                  >
                    <span className="token-order">{step.order}</span>
                    <StepIcon type={step.type} />
                    <span className="token-label">{STEP_LABEL[step.type]}</span>
                    <span className="token-team">{step.team ? teamNames[step.team] : 'Mapa que sobrar'}</span>
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ol>
      </div>

      <ul className="rail-legend">
        {LEGEND.map(({ type, text }) => (
          <li key={type} className={`legend-${type}`}>
            <StepIcon type={type} />
            <span><b>{STEP_LABEL[type]}:</b> {text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
