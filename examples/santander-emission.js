let express = require("express");
let path = require("path");

let app = express();

let Boleto = require("../index").Boleto;

let boleto = new Boleto({
  banco: "santander",
  data_emissao: new Date(),
  data_vencimento: new Date(new Date().getTime() + 5 * 24 * 3600 * 1000),
  valor: 1500,
  nosso_numero: "1234567",
  numero_documento: "123123",
  cedente: "Pagar.me Pagamentos S/A",
  cedente_cnpj: "18727053000174",
  agencia: "3978",
  codigo_cedente: "6404154", // PSK (código da carteira)
  carteira: "102",
});

console.log(boleto["linha_digitavel"]);

app.use(express.static(path.join(__dirname, "/../")));

app.get("/", function (req, res) {
  boleto.renderHTML(function (html) {
    return res.send(html);
  });
});

app.listen(3003);
