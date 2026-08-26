/**
 * Preparo de imagem no navegador, antes de enviar.
 *
 * Roda no cliente de propósito: foto de celular tem vários megabytes e chega
 * na tela como um quadrado de algumas centenas de pixels. Reduzir aqui poupa
 * a rede de quem envia (muitas vezes o 4G do balcão), o banco, e o servidor de
 * carregar uma biblioteca de imagem só para jogar 95% dos bytes fora.
 *
 * Sem "server-only" e sem import de servidor: este módulo é do navegador.
 */

/**
 * Corta no quadrado central e devolve um data URI WebP.
 *
 * O corte central é o que faz uma foto de pizza tirada na horizontal e outra
 * na vertical caberem no mesmo grid sem uma ficar deitada.
 */
export function prepararImagemQuadrada(
  arquivo: File,
  lado: number,
  qualidade: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onerror = () => reject(new Error("Não consegui ler o arquivo."));
    leitor.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Esse arquivo não é uma imagem."));
      img.onload = () => {
        const origem = Math.min(img.width, img.height);
        const canvas = document.createElement("canvas");
        canvas.width = lado;
        canvas.height = lado;

        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Não consegui processar a imagem."));

        // Fundo branco: PNG com transparência vira preto em algumas impressoras.
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, lado, lado);
        ctx.drawImage(
          img,
          (img.width - origem) / 2,
          (img.height - origem) / 2,
          origem,
          origem,
          0,
          0,
          lado,
          lado,
        );

        resolve(canvas.toDataURL("image/webp", qualidade));
      };
      img.src = leitor.result as string;
    };
    leitor.readAsDataURL(arquivo);
  });
}
