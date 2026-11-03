# selecao-maps-camp

Frontend em React do veto de mapas em tempo real para a final de um camp de Valorant. As regras, as salas e o WebSocket ficam no [backend](https://github.com/PedroHCarlini/selecao-maps-camp-backend).

## Como rodar

Precisa do Node 20 ou mais novo e do backend rodando na porta 3001.

```bash
npm install
npm run dev
```

Abra http://localhost:5173, crie a sala e envie os links que aparecem no painel da organização.

## Como funciona o veto

1. A organização cria a sala e recebe um link para cada capitão, um para espectadores e o próprio.
2. O veto começa quando os dois capitães marcam "Estou pronto".
3. Na sua vez, o capitão escolhe e confirma. Todos veem o resultado na hora.
4. Se o tempo acabar, o servidor escolhe ao acaso e registra isso na sequência.
5. A organização pode pausar, desfazer a última ação ou reiniciar o veto.

Quem perde a conexão volta sozinho e recebe o estado atual. O link do capitão funciona como senha, então não deve ser compartilhado.

A ordem do veto, os mapas e o pool sugerido são definidos no backend.

## Publicar

```bash
VITE_BACKEND_URL=https://seu-backend.exemplo.com npm run build
```

Publique a pasta `dist` em uma hospedagem estática. Ela precisa redirecionar rotas como `/sala/...` para o `index.html`. No backend, inclua o endereço do frontend em `ALLOWED_ORIGINS`.

## Limitações

As imagens dos mapas vêm de `media.valorant-api.com`. Se o serviço cair, os cards aparecem sem imagem e o veto continua funcionando.
