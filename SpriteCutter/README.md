# ✂️ SpriteCutter — Ferramenta de Recorte de Sprites

O **SpriteCutter** é uma aplicação web simples, rápida e moderna para recortar sprites e ícones de *sprite sheets* (imagens com múltiplos sprites em grade ou agrupados).

---

## ✨ Funcionalidades

- **📤 Upload Fácil**: Arraste e solte ou selecione qualquer imagem (`PNG`, `JPG`, `WEBP`, `BMP`, `GIF`).
- **🎯 Seleção Manual de Cor**: Clique em qualquer ponto da imagem para selecionar a cor do fundo a ser removida.
- **⚡ Detecção Automática (Histogram Projection)**: Identifica automaticamente os limites dos retângulos e cards dos sprites.
- **📐 Modo Grade Manual**: Caso prefira um tamanho fixo (ex: 32x32, 64x64), ajuste largura, altura, offset e espaçamento.
- **👁️ Visualização de Fundo**: Alterne o modo para ocultar o fundo no preview e identificar os sprites com facilidade.
- **✨ Remoção de Fundo**: Opção para exportar os sprites com fundo transparente.
- **🔍 Zoom e Navegação**: Controle de zoom (*zoom in/out/fit*) e navegação fluida pela imagem.
- **📦 Exportação em Lote (ZIP)**: Baixe todos os sprites recortados de uma só vez em um arquivo `.zip` ou baixe individualmente em `PNG`.

---

## 🚀 Como Executar

Não é necessário instalar nada! Trata-se de uma aplicação **Front-end pura**.

### Opção 1: Abrir diretamente no navegador
1. Faça o clone ou download deste repositório.
2. Abra o arquivo `index.html` em qualquer navegador moderno.

### Opção 2: Servidor Local (opcional)
Se preferir rodar em um servidor local estático:

```bash
# Usando npx serve
npx serve .

# Ou usando Python
python -m http.server 8000
```
Acesse `http://localhost:8000` no seu navegador.

---

## 🎮 Como Usar

1. **Faça o upload** da sua imagem de sprites.
2. **Clique na cor de fundo** na imagem (o cursor virará um conta-gotas automático).
3. Ajuste a **tolerância** de cor se necessário.
4. Clique em **Recortar Sprites**.
5. Baixe os sprites individualmente ou clique em **Baixar Todos (ZIP)**.

---

## 📁 Estrutura do Projeto

```
Sprite-cut/
├── index.html       # Interface principal da aplicação
├── style.css        # Estilos com tema escuro (Dark Mode)
├── app.js           # Lógica de processamento de imagem, algoritmo e exportação
├── jszip.min.js     # Biblioteca local para geração do arquivo ZIP
└── README.md        # Documentação do projeto
```

---

## 🛠️ Tecnologias Utilizadas

- **HTML5 Canvas**: Processamento de imagens em tempo real e renderização de previews.
- **Vanilla CSS**: Design responsivo moderno com tema escuro e micro-animações.
- **JavaScript (ES6+)**: Algoritmo de projeção de histograma para detecção inteligente de limites.
- **JSZip**: Compactação local de arquivos no navegador.

---

## 📄 Licença

Este projeto é de código aberto e está sob a licença [MIT](LICENSE). Sinta-se à vontade para utilizar e contribuir!
