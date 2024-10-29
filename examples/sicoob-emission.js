var express = require('express')
var path = require('path')

var app = express()

var Boleto = require('../index').Boleto

var boleto = new Boleto({
  'banco': 'sicoob',
  'data_emissao': new Date(),
  'data_vencimento': new Date("2024-09-19"),
  'valor': 14.18,
  'nosso_numero': '54963820',
  'numero_documento': ' 926196082400',
  'cedente': 'ACESSO TOTAL COMERCIO INTERNET E SERVICOS EIRELI',
  'cedente_cnpj': '08056131000100',
  'agencia': '3978',
  'codigo_cedente': '30031129341', // PSK (código da carteira)
  'carteira': '102'
})

console.log(boleto['linha_digitavel'])

app.use(express.static(path.join(__dirname, '/../')))

app.get('/', function (req, res) {
  boleto.renderHTML(function (html) {
    return res.send(html)
  })
})

app.listen(3003)
