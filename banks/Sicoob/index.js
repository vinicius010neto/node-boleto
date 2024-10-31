const moment = require("moment");
let formatters = require("../../lib/formatters");
let ediHelper = require("../../lib/edi-helper");

exports.options = {
  logoURL: "https://assets.pagar.me/boleto/images/sicoob.png",
  codigo: "756", // Código do banco Sicoob na câmara de compensação
};

exports.dvBarra = function (barra) {
  let resto2 = formatters.mod11(barra, 9, 1);
  return resto2 == 0 || resto2 == 1 || resto2 == 10 ? 1 : 11 - resto2;
};

exports.barcodeData = function (boleto) {
  // Verifica se um código de barras personalizado foi passado
  if (boleto.codigo_barra) {
    return boleto.codigo_barra;
  }

  let codigoBanco = this.options.codigo;
  let numMoeda = "9";

  let fatorVencimento = formatters.fatorVencimento(
    moment(boleto["data_vencimento"]).utc().format()
  );

  let valor = formatters.addTrailingZeros(boleto["valor"], 10);
  let agencia = formatters.addTrailingZeros(boleto["agencia"], 4);
  let carteira = boleto["carteira"];
  let modalidade = boleto["modalidade"];
  let codigoCedente = formatters.addTrailingZeros(boleto["codigo_cedente"], 7);
  let nossoNumero = formatters.addTrailingZeros(boleto["nosso_numero"], 9);
  let parcela = "001"; // Default para parcela única

  let barra =
    codigoBanco +
    numMoeda +
    fatorVencimento +
    valor +
    agencia +
    carteira +
    modalidade +
    codigoCedente +
    nossoNumero +
    parcela;

  let dvBarra = this.dvBarra(barra);
  let lineData = barra.substring(0, 4) + dvBarra + barra.substring(4);

  return lineData;
};

exports.linhaDigitavel = function (barcodeData) {
  let campos = [];

  // Verifica se o código de barras é customizado ou gerado
  // e usa o formato correto para evitar alterações
  let campo1, campo2, campo3, campo4, campo5;

  // Primeiro grupo
  campo1 =
    barcodeData.substring(0, 10);
  campo1 = campo1.substring(0, 5) + "." + campo1.substring(5);
  campos.push(campo1);

  // Segundo grupo
  campo2 = barcodeData.substring(10, 21);
  campo2 = campo2.substring(0, 5) + "." + campo2.substring(5);
  campos.push(campo2);

  // Terceiro grupo
  campo3 = barcodeData.substring(21, 32);
  campo3 = campo3.substring(0, 5) + "." + campo3.substring(5);
  campos.push(campo3);

  // Quarto grupo - dígito verificador do código de barras
  campo4 = barcodeData.substring(32, 33);
  campos.push(campo4);

  // Quinto grupo - fator de vencimento e valor nominal do documento
  campo5 = barcodeData.substring(33);
  campos.push(campo5);

  return campos.join(" ");
};

exports.parseEDIFile = function (fileContent) {
  try {
    const lines = fileContent.split("\n");
    const parsedFile = {
      boletos: [],
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const registro = line.substring(0, 1);

      if (registro === "0") {
        parsedFile["razao_social"] = line.substring(46, 76);
        parsedFile["data_arquivo"] = ediHelper.dateFromEdiDate(
          line.substring(94, 100)
        );
      } else if (registro === "1") {
        const boleto = {};

        parsedFile["cnpj"] = formatters.removeTrailingZeros(
          line.substring(3, 17)
        );
        parsedFile["carteira"] = formatters.removeTrailingZeros(
          line.substring(22, 24)
        );
        parsedFile["agencia_cedente"] = formatters.removeTrailingZeros(
          line.substring(17, 21)
        );
        parsedFile["conta_cedente"] = formatters.removeTrailingZeros(
          line.substring(21, 27)
        );

        boleto["codigo_ocorrencia"] = line.substring(108, 110);
        boleto["motivos_ocorrencia"] = line.substring(318, 328).trim();

        boleto["data_ocorrencia"] = ediHelper.dateFromEdiDate(
          line.substring(110, 116)
        );
        boleto["vencimento"] = ediHelper.dateFromEdiDate(
          line.substring(146, 152)
        );
        boleto["valor"] = formatters.removeTrailingZeros(
          line.substring(152, 165)
        );
        boleto["banco_recebedor"] = formatters.removeTrailingZeros(
          line.substring(165, 168)
        );
        boleto["agencia_recebedora"] = formatters.removeTrailingZeros(
          line.substring(168, 173)
        );
        boleto["valor_pago"] = formatters.removeTrailingZeros(
          line.substring(253, 266)
        );
        boleto["nosso_numero"] = formatters.removeTrailingZeros(
          line.substring(58, 73)
        );

        parsedFile.boletos.push(boleto);
      }
    }

    return parsedFile;
  } catch (e) {
    console.error(e);
    return null;
  }
};
