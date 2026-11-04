import { useCallback, useEffect, useState } from 'react';
import RoomIntro from './components/RoomIntro.jsx';
import CreateRoom from './pages/CreateRoom.jsx';
import Room from './pages/Room.jsx';
import { readRoomToken, saveRoomToken } from './roomToken.js';

const roomPath = (roomId) => `/sala/${roomId}`;

// O link traz o token no hash (/sala/ID#TOKEN), que não é enviado em requisições nem no Referer.
// Ele sai da barra de endereços assim que é lido, para não vazar em uma transmissão de tela.
// Se a aba não puder guardá-lo, continua no endereço: é melhor do que perder o acesso ao recarregar.
function readLocation() {
  const match = window.location.pathname.match(/^\/sala\/([\w-]+)\/?$/);
  if (!match) return { roomId: null, token: '' };

  const roomId = match[1];
  const linkToken = window.location.hash.slice(1);
  if (!linkToken) return { roomId, token: readRoomToken(roomId) };

  if (saveRoomToken(roomId, linkToken)) window.history.replaceState(window.history.state, '', roomPath(roomId));
  return { roomId, token: linkToken };
}

export default function App() {
  const [location, setLocation] = useState(readLocation);
  const [showIntro, setShowIntro] = useState(false);
  const closeIntro = useCallback(() => setShowIntro(false), []);

  useEffect(() => {
    const update = () => setLocation(readLocation());
    window.addEventListener('popstate', update);
    window.addEventListener('hashchange', update);
    return () => {
      window.removeEventListener('popstate', update);
      window.removeEventListener('hashchange', update);
    };
  }, []);

  if (!location.roomId) {
    return (
      <CreateRoom
        onCreated={({ id, adminToken }) => {
          const saved = saveRoomToken(id, adminToken);
          window.history.pushState(null, '', saved ? roomPath(id) : `${roomPath(id)}#${adminToken}`);
          window.scrollTo(0, 0);
          setShowIntro(true);
          setLocation(readLocation());
        }}
      />
    );
  }
  return (
    <>
      <Room key={`${location.roomId}#${location.token}`} roomId={location.roomId} token={location.token} />
      {showIntro && <RoomIntro onDone={closeIntro} />}
    </>
  );
}
