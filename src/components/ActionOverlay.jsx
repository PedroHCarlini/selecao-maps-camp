import { useEffect, useRef, useState } from 'react';
import { playActionSound } from '../sound.js';

const DURATION_MS = { ban: 2600, pick: 2400, decider: 2400, side: 2600 };
const SIDES = { attack: 'Ataque', defense: 'Defesa' };
// Uma ação pode gerar duas entradas (a última escolha e o decider automático).
// Depois de uma queda de conexão, só isso é mostrado, para não reproduzir o veto inteiro.
const MAX_QUEUED = 2;

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// O componente nasce com o histórico já visto, então abrir ou recarregar a página não anima nada.
function useActionQueue(log, done, onVetoFinished) {
  const seen = useRef(log.length);
  const [queue, setQueue] = useState([]);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    const previous = seen.current;
    seen.current = log.length;
    if (log.length < previous) {
      setQueue([]);
      setFinishing(false);
    } else if (log.length > previous && prefersReducedMotion()) {
      // Sem animação na fila, o som toca aqui. Movimento reduzido não significa sem áudio.
      playActionSound(log.at(-1).type);
    } else if (log.length > previous) {
      const added = log
        .map((entry, index) => ({ ...entry, id: index }))
        .slice(previous)
        .slice(-MAX_QUEUED);
      setQueue((current) => [...current, ...added]);
      setFinishing(done);
    }
  }, [log, done]);

  // Só avisa que o veto terminou depois que a última animação sair da tela.
  useEffect(() => {
    if (finishing && queue.length === 0) {
      setFinishing(false);
      onVetoFinished();
    }
  }, [finishing, queue.length, onVetoFinished]);

  const current = queue[0] ?? null;
  const currentId = current?.id;
  const currentType = current?.type;

  useEffect(() => {
    if (currentId === undefined) return undefined;
    const timer = setTimeout(() => setQueue((items) => items.slice(1)), DURATION_MS[currentType]);
    return () => clearTimeout(timer);
  }, [currentId, currentType]);

  return current;
}

// A versão leve aparece na hora; a de alta resolução cobre por cima assim que carregar.
function MapPicture({ images }) {
  const hideOnError = (e) => { e.currentTarget.style.display = 'none'; };
  return (
    <>
      <img className="fx-img" src={images.small} alt="" onError={hideOnError} />
      <img className="fx-img" src={images.large} alt="" onError={hideOnError} />
    </>
  );
}

function AutoNote({ entry }) {
  return entry.auto ? <small className="fx-auto">Tempo esgotado: escolha automática</small> : null;
}

function BanEffect({ entry, images, teams }) {
  return (
    <>
      <div className="fx-half fx-half-left"><MapPicture images={images} /></div>
      <div className="fx-half fx-half-right"><MapPicture images={images} /></div>
      <svg className="fx-slash" viewBox="0 0 100 100" preserveAspectRatio="none">
        <line x1="56" y1="0" x2="44" y2="100" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="fx-caption fx-ban-caption">
        <span className="fx-kicker">Banido</span>
        <strong className="fx-map">{entry.map}</strong>
        <span className="fx-by">por {teams[entry.team].name}</span>
        <AutoNote entry={entry} />
      </div>
    </>
  );
}

function RevealEffect({ entry, images, teams }) {
  const isDecider = entry.type === 'decider';
  return (
    <>
      <div className="fx-reveal"><MapPicture images={images} /></div>
      <div className="fx-caption fx-reveal-caption">
        <span className="fx-kicker">{isDecider ? 'Decider' : 'Pick'}</span>
        <strong className="fx-map">{entry.map}</strong>
        <span className="fx-by">{isDecider ? 'Último mapa da série' : `Escolhido por ${teams[entry.team].name}`}</span>
        <AutoNote entry={entry} />
      </div>
    </>
  );
}

function SideEffect({ entry, images, teams }) {
  const opposite = entry.side === 'attack' ? 'defense' : 'attack';
  const sideOf = (team) => (team === entry.team ? entry.side : opposite);
  return (
    <>
      <div className="fx-side-bg"><MapPicture images={images} /></div>
      <div className="fx-side-title">
        <span className="fx-kicker">Lados</span>
        <strong>{entry.map}</strong>
        <AutoNote entry={entry} />
      </div>
      <div className="fx-side-panels">
        {['A', 'B'].map((team) => (
          <div key={team} className={`fx-panel fx-panel-${team} fx-panel-${sideOf(team)} ${team === entry.team ? 'is-chooser' : ''}`}>
            <span className="fx-panel-team">{teams[team].name}</span>
            <strong className="fx-panel-side">{SIDES[sideOf(team)]}</strong>
            <span className="fx-panel-note">{team === entry.team ? 'Escolheu o lado' : 'Fica com o outro lado'}</span>
          </div>
        ))}
      </div>
    </>
  );
}

const EFFECTS = { ban: BanEffect, pick: RevealEffect, decider: RevealEffect, side: SideEffect };

// Só visual: não recebe cliques, e o título da sala já anuncia a mudança para leitores de tela.
export default function ActionOverlay({ log, done, images, teams, onVetoFinished }) {
  const entry = useActionQueue(log, done, onVetoFinished);
  const entryId = entry?.id;
  const entryType = entry?.type;

  useEffect(() => {
    if (entryId !== undefined) playActionSound(entryType);
  }, [entryId, entryType]);

  if (!entry) return null;
  const Effect = EFFECTS[entry.type];
  return (
    <div
      key={entry.id}
      className={`fx fx-${entry.type}`}
      style={{ '--fx-duration': `${DURATION_MS[entry.type]}ms` }}
      aria-hidden="true"
      data-testid="action-overlay"
    >
      <Effect entry={entry} images={images[entry.map]} teams={teams} />
    </div>
  );
}
