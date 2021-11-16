//const XLSX = require("xlsx-js-style");
const XLSX = require("xlsx");
const Utils = XLSX.utils; // XLSX.utilsのalias
// Workbookの読み込み
const book = XLSX.readFile("../tatebayashi_stones.xlsx");
// Sheet1読み込み
const pois_sheet = book.Sheets["pois"];

//
const fs = require('fs-extra');

const pois_json = fs.readJsonSync('../pois.geojson');

const features = pois_json.features;

let cols = [];

features.map((feature, index) => {
  const props = feature.properties;
  const geoms = feature.geometry.coordinates;
  if (index === 0) {
    cols = Object.keys(props);
    cols.push('longitude');
    cols.push('latitude');
    cols.map((col, i) => {
      const address = Utils.encode_cell({ r: 0, c: i });
      pois_sheet[address] = { t: "s", v: col, w: col };
    });
  }
  cols.map((col, i) => {
    const address = Utils.encode_cell({ r: 1 + index, c: i });
    if (col === 'longitude') {
      pois_sheet[address] = { t: "n", v: geoms[0], w: geoms[0] };
    } else if (col === 'latitude') {
      pois_sheet[address] = { t: "n", v: geoms[1], w: geoms[1] };
    } else {
      const t = props[col] === null || typeof props[col] === 'string' ? 's' : 'n';
      pois_sheet[address] = { t: t, v: props[col] === null ? '' : props[col], w: props[col] === null ? '' : props[col] };
    }
  });
});

const br = Utils.encode_cell({ r: features.length, c: cols.length - 1 });

pois_sheet["!ref"] = `A1:${br}`;

book.Sheets["pois"] = pois_sheet;

console.log("Hoge");

XLSX.writeFile(book, "../tatebayashi_stones.xlsx");