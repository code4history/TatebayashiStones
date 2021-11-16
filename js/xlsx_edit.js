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

function poisType() {
  return [
    ["fid", "ID", "n"],
    ["name", "名称", "s"],
    ["type", "種別", "s"],
    ["era", "和暦", "s"],
    ["year", "年", "s"],
    ["oaza", "大字", "s"],
    ["koaza", "小字", "s"],
    ["detail_place", "詳細場所", "s"],
    ["reference_memo", "参照本情報", "s"],
    ["folklore", "言い伝え", "s"],
    ["history", "歴史", "s"],
    ["survey_memo", "調査情報", "s"],
    ["area", "地域", "s"],
    ["surveyed", "調査日", "s"],
    ["public_relations", "広報誌", "s"],
    ["confirmed", "現況確認済み", "b"],
    ["primary_image", "優先画像ID", "n"],
    ["height", "総高", "n"],
    ["statue_height", "像高", "n"],
    ["width", "幅", "n"],
    ["depth", "厚さ", "n"],
    ["shape", "形状", "s"],
    ["material", "材質", "s"],
    ["inscription", "刻銘", "s"],
    ["color", "色", "s"],
    ["contradiction", "データの矛盾", "s"],
    ["need_action", "要対応", "s"],
    ["status", "状況", "s"],
    ["longitude", "経度", "n"],
    ["latitude", "緯度", "n"]
  ];
}