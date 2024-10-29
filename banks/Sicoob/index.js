// 01-03    -> Código do Sicoob na câmara de compensação (756)
// 04-04    -> Código da moeda (9 - Real)
// 05-05    -> Dígito verificador do código de barras
// 06-09    -> Fator de vencimento
// 10-19    -> Valor do boleto
// 20-23    -> Código da agência/cooperativa (sem dígito)
// 24-24    -> Código da carteira
// 25-25    -> Código da modalidade
// 26-32    -> Código do beneficiário/cliente (sem dígito)
// 33-41    -> Nosso número do boleto
// 42-44    -> Número da parcela (001 se parcela única)

const moment = require("moment");
let formatters = require("../../lib/formatters");
let ediHelper = require("../../lib/edi-helper");
let helper = require("./helper");

exports.options = {
  logoURL: "https://assets.pagar.me/boleto/images/santander.png",
  codigo: "756", // Código do Sicoob
};

exports.dvBarra = function (barra) {
  let resto2 = formatters.mod11(barra, 9, 1);
  return resto2 == 0 || resto2 == 1 || resto2 == 10 ? 1 : 11 - resto2;
};

exports.barcodeData = function (boleto) {
  let codigoBanco = this.options.codigo;
  let numMoeda = "9";
  let fatorVencimento = formatters.fatorVencimento(
    moment(boleto["data_vencimento"]).utc().format()
  );
  let valor = formatters.addTrailingZeros(boleto["valor"], 10);

  // Campos específicos do Sicoob
  let codigoAgencia = formatters.addTrailingZeros(boleto["agencia"], 4); // Código da agência
  let carteira = boleto["carteira"];
  let modalidade = boleto["modalidade"] || "1"; // Modalidade de cobrança
  let codigoBeneficiario = formatters.addTrailingZeros(
    boleto["codigo_cedente"],
    7
  );

  // Nosso Número para o Sicoob é de 9 dígitos (sem o dígito verificador)
  let nossoNumero = formatters.addTrailingZeros(boleto["nosso_numero"], 9);

  // Montagem do código de barras seguindo o layout do Sicoob
  let barra =
    codigoBanco +
    numMoeda +
    fatorVencimento +
    valor +
    codigoAgencia +
    carteira +
    modalidade +
    codigoBeneficiario +
    nossoNumero;

  let dvBarra = this.dvBarra(barra);
  let lineData =
    barra.substring(0, 4) + dvBarra + barra.substring(4, barra.length);

  return lineData;
};

exports.linhaDigitavel = function (barcodeData) {
  let campos = [];

  // 1. Primeiro Grupo
  let campo =
    barcodeData.substring(0, 3) +
    barcodeData.substring(3, 4) +
    barcodeData.substring(19, 20) +
    barcodeData.substring(20, 24);
  campo = campo + formatters.mod10(campo);
  campo = campo.substring(0, 5) + "." + campo.substring(5, campo.length);
  campos.push(campo);

  // 2. Segundo Grupo
  campo = barcodeData.substring(24, 34);
  campo = campo + formatters.mod10(campo);
  campo = campo.substring(0, 5) + "." + campo.substring(5, campo.length);
  campos.push(campo);

  // 3. Terceiro Grupo
  campo = barcodeData.substring(34, 44);
  campo = campo + formatters.mod10(campo);
  campo = campo.substring(0, 5) + "." + campo.substring(5, campo.length);
  campos.push(campo);

  // 4. Campo - dígito verificador do código de barras
  campo = barcodeData.substring(4, 5);
  campos.push(campo);

  // 5. Campo - fator de vencimento e valor nominal
  campo = barcodeData.substring(5, 9) + barcodeData.substring(9, 19);
  campos.push(campo);

  return campos.join(" ");
};

exports.parseEDIFile = function (fileContent) {
  try {
    let lines = fileContent.split("\n");
    let parsedFile = {
      boletos: {},
    };

    let currentNossoNumero = null;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      let registro = line.substring(7, 8);

      if (registro == "0") {
        parsedFile["cnpj"] = line.substring(17, 32);
        parsedFile["razao_social"] = line.substring(72, 102);
        parsedFile["agencia_cedente"] = line.substring(32, 36);
        parsedFile["conta_cedente"] = line.substring(37, 47);
        parsedFile["data_arquivo"] = helper.dateFromEdiDate(
          line.substring(143, 152)
        );
      } else if (registro == "3") {
        let segmento = line.substring(13, 14);

        let boleto = {};
        if (segmento == "T") {
          boleto["codigo_ocorrencia"] = line.substring(15, 17);
          boleto["vencimento"] = formatters.dateFromEdiDate(
            line.substring(69, 77)
          );
          boleto["valor"] = formatters.removeTrailingZeros(
            line.substring(77, 92)
          );
          boleto["tarifa"] = formatters.removeTrailingZeros(
            line.substring(193, 208)
          );
          boleto["banco_recebedor"] = formatters.removeTrailingZeros(
            line.substring(92, 95)
          );
          boleto["agencia_recebedora"] = formatters.removeTrailingZeros(
            line.substring(95, 100)
          );

          currentNossoNumero = formatters.removeTrailingZeros(
            line.substring(40, 52)
          );
          parsedFile.boletos[currentNossoNumero] = boleto;
        } else if (segmento == "U") {
          parsedFile.boletos[currentNossoNumero]["valor_pago"] =
            formatters.removeTrailingZeros(line.substring(77, 92));

          let paid =
            parsedFile.boletos[currentNossoNumero]["valor_pago"] >=
            parsedFile.boletos[currentNossoNumero]["valor"];
          paid =
            paid &&
            parsedFile.boletos[currentNossoNumero]["codigo_ocorrencia"] == "17";

          boleto = parsedFile.boletos[currentNossoNumero];

          boleto["pago"] = paid;
          boleto["edi_line_number"] = i;
          boleto["edi_line_checksum"] = ediHelper.calculateLineChecksum(line);
          boleto["edi_line_fingerprint"] =
            boleto["edi_line_number"] + ":" + boleto["edi_line_checksum"];

          currentNossoNumero = null;
        }
      }
    }

    return parsedFile;
  } catch (e) {
    return null;
  }
};
