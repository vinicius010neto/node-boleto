let fs = require("fs");
let path = require("path");

let ediParser = require("../index").EdiParser;

console.log(
  ediParser.parse(
    "bradesco",
    fs.readFileSync(path.join(__dirname, "retorno_bradesco.txt")).toString()
  )
);
