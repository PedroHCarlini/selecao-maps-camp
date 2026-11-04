// O código de acesso fica guardado só nesta aba: recarregar mantém o papel, e uma aba nova sem código entra como espectador.
const keyOf = (roomId) => `veto-room-token:${roomId}`;

export function saveRoomToken(roomId, token) {
  try {
    sessionStorage.setItem(keyOf(roomId), token);
    return true;
  } catch {
    return false;
  }
}

export function readRoomToken(roomId) {
  try {
    return sessionStorage.getItem(keyOf(roomId)) ?? '';
  } catch {
    return '';
  }
}

export function clearRoomToken(roomId) {
  try {
    sessionStorage.removeItem(keyOf(roomId));
  } catch {
    // Sem armazenamento, não há nada para limpar.
  }
}
