let fs = require("fs");
let path = require("path");

let ediParser = require("../index").EdiParser;

console.log(
  ediParser.parse(
    "santander",
    fs.readFileSync(path.join(__dirname, "/retorno.txt")).toString()
  )
);
