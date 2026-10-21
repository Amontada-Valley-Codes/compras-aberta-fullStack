/**
 * Abre uma imagem ou documento em uma nova aba do navegador para visualização.
 * Não baixa o arquivo no computador do usuário.
 *
 * @param source URL (string) ou arquivo selecionado no input (File)
 * @param fallbackTitle Título opcional da janela
 */
export function openDocumentInNewTab(source: string | File | null | undefined, fallbackTitle?: string): void {
  if (!source) return;

  if (source instanceof File) {
    const objectUrl = URL.createObjectURL(source);
    const newWindow = window.open(objectUrl, "_blank", "noopener,noreferrer");

    // Se a janela abriu com sucesso, revogamos a URL de objeto após um tempo para liberar memória
    if (newWindow) {
      setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 60000); // 1 minuto de retenção em memória
    }
    return;
  }

  if (typeof source === "string") {
    // Se for uma string de Data URI (base64)
    if (source.startsWith("data:")) {
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${fallbackTitle || "Visualização do Documento"}</title>
              <style>
                body { margin: 0; background: #0e1726; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
                img { max-width: 100%; max-height: 100vh; object-fit: contain; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
              </style>
            </head>
            <body>
              <img src="${source}" alt="Documento" />
            </body>
          </html>
        `);
        win.document.close();
      }
      return;
    }

    // Se for uma URL relativa ou absoluta
    window.open(source, "_blank", "noopener,noreferrer");
  }
}
