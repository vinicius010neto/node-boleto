let express = require("express");
let path = require("path");

let app = express();

let Boleto = require("../index").Boleto;

let boleto = new Boleto({
  banco: "sicoob",
  data_emissao: new Date(),
  data_vencimento: new Date(new Date().getTime() + 5 * 24 * 3600 * 1000),
  valor: 1500,
  nosso_numero: "123456789",
  numero_documento: "123123",
  cedente: "Empresa Exemplo S/A",
  cedente_cnpj: "12345678000123",
  agencia: "1234",
  codigo_cedente: "5678901",
  carteira: "1",
  modalidade: "01",
  codigo_barra: "756912345000000150012340100567890123456789001", // Exemplo de código de barras personalizado
});

console.log(boleto["linha_digitavel"]);

app.use(express.static(path.join(__dirname, "/../")));

app.get("/", function (req, res) {
  boleto.renderHTML(function (html) {
    return res.send(html);
  });
});

app.listen(3003, () =>
  console.log("Servidor rodando em http://localhost:3003")
);
