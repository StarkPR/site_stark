# Stark · Robótica de Apucarana

## Abrir o site

Com Docker Compose, execute `docker compose up` na pasta deste arquivo e abra http://localhost:8080. O Apache atende os arquivos públicos e a página PHP, que consulta a API Java no serviço interno catalogo. Os dados são de leitura pública. Ao editar o JSON, o serviço Java passa a devolver a nova versão.

Para trabalhar só no visual, execute `python -m http.server 8000 --directory dist` e abra http://localhost:8000. A prévia hospedada utiliza essa mesma versão estática, que lê o catálogo diretamente. Use HTTP local para carregar modelos e dados.

## Onde editar

- **CAD do robô:** em `dist/js/robo-cad.js`, altere `ARQUIVO_CAD` para o caminho do arquivo OBJ exportado do seu editor CAD, relativo a `dist/`. O visualizador lê vértices e faces poligonais, centraliza a geometria e ajusta a escala. Exporte uma malha simplificada. O cubo é a geometria provisória.
- **Identidade, texto e fotos:** em `dist/data/equipe.json`, preencha quem somos, fundação, visão, missão e valores. Coloque os novos arquivos em `dist/assets/` e indique os caminhos relativos no catálogo.
- **Galeria:** cada registro tem tipo (foto ou video), arquivo e legenda. Para vídeo, use um MP4 ou WebM reproduzível pelo navegador.
- **OBR e prêmios** — em `dist/data/equipe.json`, edite a entrada da OBR em `competicoes` e inclua cada premiação em `premios` com os campos `titulo` e `edicao`. O diário aceita registros com `titulo` e `texto`.
- **Ficha do robô** — preencha os campos `tipo`, `componentes` e `programacao` no objeto `robo`. Eles aparecem ao lado do modelo no visualizador ampliado.
- **Integrantes** — os registros incluem `nome`, `funcao`, `foto` e `instagram`. Uma foto preenchida substitui a inicial e continua levando ao perfil correspondente.
- **Apoiadores** — cada registro em `apoiadores` contém `nome` e `imagem`. Os links de contato da equipe ficam em `dist/index.html`.
- **Uniforme:** arquivos do modelo em `dist/assets/uniforme/`, interação em `dist/js/uniforme.js`.
- **Cores e layout:** variáveis no início de `dist/css/site.css`. Estrutura das seções em `dist/index.html`.

## Tela cheia, peças e páginas da equipe

O ícone de tela cheia abre a bancada 3D. O botão “Conheça nosso robô” abre a ficha técnica. Na bancada, arraste o modelo para girá-lo. Um toque curto isola a peça, aproxima a câmera e exibe o seu nome no seletor. “Ver conjunto” recupera a vista geral.

Ao exportar o OBJ, preserve objetos ou grupos nomeados por peça (linhas `o` e `g`). O seletor e a identificação por toque usam esses nomes. Uma malha única sem grupos é identificada como um único componente. Para experimentar hoje, use as seis faces do cubo provisório.

Cada arquivo em `dist/sobre/` corresponde a um cartão da página inicial. Edite os parágrafos em `.article-text` e acrescente fotos com texto alternativo e legendas em `.article-layout`. Os textos curtos da página inicial continuam em `dist/data/equipe.json`.
