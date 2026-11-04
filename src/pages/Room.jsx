import { useCallback, useEffect, useState } from 'react';
import ActionOverlay from '../components/ActionOverlay.jsx';
import FinalSummary from '../components/FinalSummary.jsx';
import SeriesReveal from '../components/SeriesReveal.jsx';
import SoundToggle from '../components/SoundToggle.jsx';
import { useRoom } from '../useRoom.js';

const SIDES = { attack: 'Ataque', defense: 'Defesa' };
const ACTION_VERB = { ban: 'banir', pick: 'escolher', side: 'escolher o lado' };
const STEP_LABEL = { ban: 'Ban', pick: 'Pick', side: 'Lado', decider: 'Decider' };

export default function Room({ roomId, token }) {
  const { connection, state, role, tokens, fatal, error, syncedAt, send } = useRoom(roomId, token);
  const [selection, setSelection] = useState(null);
  const [submittedStep, setSubmittedStep] = useState(null);
  const [toast, setToast] = useState(null);
  const [seriesOpen, setSeriesOpen] = useState(false);
  const openSeries = useCallback(() => setSeriesOpen(true), []);

  const stepIndex = state?.veto.stepIndex;

  // Nova etapa: descarta a seleção. Reconexão ou recusa: libera o botão de novo.
  useEffect(() => {
    setSelection(null);
    setSubmittedStep(null);
  }, [stepIndex]);

  useEffect(() => {
    if (connection !== 'online') setSubmittedStep(null);
  }, [connection]);

  useEffect(() => {
    if (!error) return undefined;
    setSubmittedStep(null);
    setSelection(null);
    setToast(error.message);
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [error]);

  if (fatal) {
    return (
      <main className="message-page">
        <h1>{fatal}</h1>
        <p>Peça um novo link para a organização.</p>
        <a className="primary" href="/">Criar outra sala</a>
      </main>
    );
  }

  if (!state) {
    return (
      <main className="message-page">
        <h1>Conectando à sala…</h1>
      </main>
    );
  }

  const { veto, teams, status } = state;
  const online = connection === 'online';
  const myTurn = status === 'live' && veto.current?.team === role;
  const canAct = myTurn && online && submittedStep !== stepIndex;
  const nameOf = (team) => teams[team].name;

  function confirm() {
    if (!selection || !canAct) return;
    if (send({ type: 'action', stepIndex, ...selection })) setSubmittedStep(stepIndex);
  }

  return (
    <div className={`room status-${status}`}>
      {!online && (
        <div className="conn-banner" role="status">
          Conexão perdida. Reconectando…
        </div>
      )}

      <Scoreboard state={state} role={role} syncedAt={syncedAt} />

      <main className="room-body">
        <TurnBanner state={state} myTurn={myTurn} nameOf={nameOf} />

        {status === 'waiting' && <ReadyPanel state={state} role={role} send={send} online={online} />}

        {status !== 'waiting' && myTurn && veto.current.type === 'side' && (
          <SidePicker
            map={veto.sideTarget}
            selected={selection?.side}
            disabled={!canAct}
            onSelect={(side) => setSelection({ side })}
          />
        )}

        {status === 'done' ? (
          <FinalSummary
            veto={veto}
            images={state.images}
            nameOf={nameOf}
            formatLabel={state.formatLabel}
            onReplay={openSeries}
          >
            <TimelineList veto={veto} nameOf={nameOf} />
          </FinalSummary>
        ) : (
          <>
            <MapGrid
              veto={veto}
              images={state.images}
              nameOf={nameOf}
              status={status}
              selectable={canAct && veto.current?.type !== 'side'}
              actionType={veto.current?.type}
              selected={selection?.map}
              onSelect={(map) => setSelection({ map })}
            />

            <div className="room-columns">
              <SeriesPanel veto={veto} nameOf={nameOf} />
              <section className="panel">
                <h2>Sequência</h2>
                <TimelineList veto={veto} nameOf={nameOf} />
              </section>
            </div>
          </>
        )}

        {role === 'admin' && <AdminPanel state={state} tokens={tokens} roomId={roomId} send={send} online={online} />}
        {role !== 'admin' && role !== 'spectator' && <p className="role-note">Você é capitão de <b>{nameOf(role)}</b>. Não compartilhe este link.</p>}
        {role === 'spectator' && <p className="role-note">Você está assistindo como espectador.</p>}
      </main>

      {myTurn && selection && (
        <div className={`confirm-bar confirm-${veto.current.type}`}>
          <p>
            {veto.current.type === 'side'
              ? <>Começar em <b>{SIDES[selection.side]}</b> na {veto.sideTarget}?</>
              : <>{veto.current.type === 'ban' ? 'Banir' : 'Escolher'} <b>{selection.map}</b>?</>}
          </p>
          <div>
            <button className="ghost" onClick={() => setSelection(null)} disabled={!canAct}>Cancelar</button>
            <button className="primary" onClick={confirm} disabled={!canAct}>
              {submittedStep === stepIndex ? 'Enviando…' : 'Confirmar'}
            </button>
          </div>
        </div>
      )}

      <ActionOverlay
        log={veto.log}
        done={veto.done}
        images={state.images}
        teams={teams}
        onVetoFinished={openSeries}
      />

      {seriesOpen && status === 'done' && (
        <SeriesReveal
          series={veto.series}
          images={state.images}
          teams={teams}
          formatLabel={state.formatLabel}
          onClose={() => setSeriesOpen(false)}
        />
      )}

      <SoundToggle />

      {toast && <div className="toast" role="alert">{toast}</div>}
    </div>
  );
}

function Scoreboard({ state, role, syncedAt }) {
  const { teams, veto, status, presence } = state;
  const activeTeam = status === 'live' || status === 'paused' ? veto.current?.team : null;
  const total = veto.steps.filter((s) => s.type !== 'decider').length;
  const done = veto.log.filter((entry) => entry.type !== 'decider').length;

  return (
    <header className="scoreboard">
      {['A', 'B'].map((team) => (
        <div key={team} className={`team team-${team} ${activeTeam === team ? 'is-active' : ''}`}>
          <span className="team-name">{teams[team].name}</span>
          <span className={`presence ${presence[team] > 0 ? 'on' : ''}`}>
            {presence[team] > 0 ? 'Capitão online' : 'Capitão offline'}
            {role === team && ' · você'}
          </span>
        </div>
      ))}
      <div className="clock">
        <span className="format">{state.formatLabel}</span>
        <Countdown state={state} syncedAt={syncedAt} />
        <span className="progress">{status === 'waiting' ? 'Aguardando' : `Ação ${Math.min(done + 1, total)} de ${total}`}</span>
      </div>
    </header>
  );
}

function Countdown({ state, syncedAt }) {
  const { status, timerSeconds, remainingMs } = state;
  const running = status === 'live' && timerSeconds > 0;
  const [now, setNow] = useState(() => performance.now());

  useEffect(() => {
    if (!running) return undefined;
    const timer = setInterval(() => setNow(performance.now()), 200);
    return () => clearInterval(timer);
  }, [running]);

  if (!timerSeconds || status === 'waiting' || status === 'done') return <span className="time idle">VS</span>;
  if (status === 'paused') return <span className="time paused">{Math.ceil(remainingMs / 1000)}</span>;
  const left = Math.max(0, Math.ceil((remainingMs - Math.max(0, now - syncedAt)) / 1000));
  return <span className={`time ${left <= 10 ? 'urgent' : ''}`} role="timer">{left}</span>;
}

function TurnBanner({ state, myTurn, nameOf }) {
  const { veto, status } = state;
  let title;
  let tone = 'neutral';
  if (status === 'waiting') title = 'Aguardando os capitães';
  else if (status === 'done') {
    title = 'Veto concluído';
    tone = 'done';
  } else if (status === 'paused') {
    title = 'Veto pausado pela organização';
    tone = 'paused';
  } else if (myTurn) {
    const type = veto.current.type;
    title = type === 'side'
      ? `Sua vez: escolha o lado em ${veto.sideTarget}`
      : `Sua vez: ${ACTION_VERB[type]} um mapa`;
    tone = type === 'side' ? 'mine' : type;
  } else {
    const type = veto.current.type;
    const team = nameOf(veto.current.team);
    title = type === 'side'
      ? `${team} está escolhendo o lado em ${veto.sideTarget}`
      : `${team} vai ${ACTION_VERB[type]} um mapa`;
  }
  return <h1 className={`turn-banner tone-${tone}`} aria-live="polite">{title}</h1>;
}

function ReadyPanel({ state, role, send, online }) {
  const { ready, teams, presence } = state;
  const isCaptain = role === 'A' || role === 'B';
  return (
    <section className="ready-panel">
      <ul>
        {['A', 'B'].map((team) => (
          <li key={team} className={ready[team] ? 'is-ready' : ''}>
            <b>{teams[team].name}</b>
            <span>{ready[team] ? 'Pronto' : presence[team] > 0 ? 'Na sala' : 'Ainda não entrou'}</span>
          </li>
        ))}
      </ul>
      {isCaptain && !ready[role] && (
        <button className="primary" disabled={!online} onClick={() => send({ type: 'ready' })}>
          Estou pronto
        </button>
      )}
      <p className="hint">O veto começa quando os dois capitães estiverem prontos.</p>
    </section>
  );
}

function SidePicker({ map, selected, disabled, onSelect }) {
  return (
    <section className="side-picker" aria-label={`Escolher lado em ${map}`}>
      {Object.entries(SIDES).map(([value, label]) => (
        <button
          key={value}
          className={`side side-${value}`}
          aria-pressed={selected === value}
          disabled={disabled}
          onClick={() => onSelect(value)}
        >
          {label}
        </button>
      ))}
    </section>
  );
}

function MapGrid({ veto, images, nameOf, status, selectable, actionType, selected, onSelect }) {
  return (
    <section className={`map-grid ${selectable ? `is-selecting action-${actionType}` : ''}`} aria-label="Mapas">
      {veto.maps.map((map) => {
        const available = map.status === 'available';
        const isTarget = veto.sideTarget === map.name;
        return (
          <button
            key={map.name}
            className={`map-card map-${map.status} ${selected === map.name ? 'is-selected' : ''} ${isTarget ? 'is-target' : ''}`}
            disabled={!selectable || !available}
            aria-pressed={selected === map.name}
            onClick={() => onSelect(map.name)}
          >
            <picture>
              <source media="(min-width: 761px)" srcSet={images[map.name].large} />
              <img src={images[map.name].small} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            </picture>
            <span className="map-name">{map.name}</span>
            {map.status === 'banned' && <span className="map-tag tag-ban">Ban · {nameOf(map.by)}</span>}
            {map.status === 'picked' && <span className="map-tag tag-pick">Pick · {nameOf(map.by)}</span>}
            {map.status === 'decider' && <span className="map-tag tag-decider">Decider</span>}
            {status === 'waiting' && available && <span className="map-tag tag-idle">No pool</span>}
          </button>
        );
      })}
    </section>
  );
}

function SeriesPanel({ veto, nameOf }) {
  return (
    <section className="panel">
      <h2>Ordem da série</h2>
      {veto.series.length === 0 ? (
        <p className="hint">Os mapas escolhidos aparecem aqui.</p>
      ) : (
        <ol className="series">
          {veto.series.map((entry, index) => (
            <li key={entry.map}>
              <span className="series-index">{index + 1}</span>
              <div className="series-map">
                <b>{entry.map}</b>
                <small>{entry.decider ? 'Decider' : `Pick de ${nameOf(entry.pickedBy)}`}</small>
              </div>
              {entry.sides ? (
                <div className="series-sides">
                  <span>{nameOf('A')}: <b className={`txt-${entry.sides.A}`}>{SIDES[entry.sides.A]}</b></span>
                  <span>{nameOf('B')}: <b className={`txt-${entry.sides.B}`}>{SIDES[entry.sides.B]}</b></span>
                </div>
              ) : (
                <small className="series-pending">Lado pendente</small>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function TimelineList({ veto, nameOf }) {
  let logIndex = 0;
  return (
    <ol className="timeline">
      {veto.steps.map((step, index) => {
        const entry = index < veto.stepIndex ? veto.log[logIndex++] : null;
        const state = index < veto.stepIndex ? 'done' : index === veto.stepIndex ? 'current' : 'next';
        return (
          <li key={index} className={`tl-${state} tl-${step.type}`} aria-current={state === 'current' ? 'step' : undefined}>
            <span className="tl-type">{STEP_LABEL[step.type]}</span>
            <span className="tl-team">{step.team ? nameOf(step.team) : 'Automático'}</span>
            <span className="tl-result">
              {entry && (entry.type === 'side' ? `${entry.map}: ${SIDES[entry.side]}` : entry.map)}
              {entry?.auto && <em> (tempo esgotado)</em>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function AdminPanel({ state, tokens, roomId, send, online }) {
  const { status, teams, veto } = state;
  const base = `${window.location.origin}/sala/${roomId}`;
  const links = tokens
    ? [
        { label: `Capitão ${teams.A.name}`, url: `${base}#${tokens.A}` },
        { label: `Capitão ${teams.B.name}`, url: `${base}#${tokens.B}` },
        { label: 'Espectadores / transmissão', url: base },
        { label: 'Organização (este link)', url: `${base}#${tokens.admin}` },
      ]
    : [];
  const canPause = status === 'live' || status === 'paused';

  return (
    <section className="panel admin">
      <h2>Organização</h2>
      <div className="admin-actions">
        <button
          className="ghost"
          disabled={!online || !canPause}
          onClick={() => send({ type: status === 'paused' ? 'resume' : 'pause' })}
        >
          {status === 'paused' ? 'Retomar' : 'Pausar'}
        </button>
        <button className="ghost" disabled={!online || veto.log.every((e) => e.type === 'decider')} onClick={() => send({ type: 'undo' })}>
          Desfazer última ação
        </button>
        <button
          className="ghost danger"
          disabled={!online || status === 'waiting'}
          onClick={() => {
            if (window.confirm('Reiniciar o veto do zero? Todas as escolhas serão apagadas.')) send({ type: 'reset' });
          }}
        >
          Reiniciar veto
        </button>
      </div>
      <ul className="links">
        {links.map((link) => (
          <CopyLink key={link.label} {...link} />
        ))}
      </ul>
      <p className="hint">Guarde o link da organização fora da tela da live. Se fechar esta aba, é ele que devolve o seu acesso.</p>
    </section>
  );
}

// O link começa oculto para não vazar se a organização estiver transmitindo a tela.
function CopyLink({ label, url }) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [visible, setVisible] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopyFailed(false);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopyFailed(true);
    }
  }
  return (
    <li>
      <span>{label}</span>
      <div className="link-field">
        <input
          readOnly
          value={visible ? url : '•'.repeat(32)}
          onFocus={(e) => visible && e.target.select()}
          aria-label={visible ? `Link: ${label}` : `Link oculto: ${label}`}
        />
        <button
          type="button"
          className="link-eye"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={`${visible ? 'Ocultar' : 'Mostrar'} link: ${label}`}
          title={visible ? 'Ocultar link' : 'Mostrar link'}
        >
          <EyeIcon open={visible} />
        </button>
      </div>
      <button className="ghost" onClick={copy}>{copied ? 'Copiado' : 'Copiar'}</button>
      {copyFailed && <p className="hint link-error" role="status">Não foi possível copiar. Clique no olho para ver o link.</p>}
    </li>
  );
}

function EyeIcon({ open }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
      {!open && <path d="M4 4l16 16" />}
    </svg>
  );
}
