const XLSX = require("xlsx");
const Utils = XLSX.utils; // XLSX.utilsのalias

const book = XLSX.readFile("../tatebayashi_stones.xlsx");

const pois_sheet = book.Sheets["pois"];
const images_sheet = book.Sheets["images"];
const refs_sheet = book.Sheets["refs"];
const books_sheet = book.Sheets["books"];

const fs = require('fs-extra');

const pois_geojson = fs.readJsonSync('../pois.geojson');
const images_geojson = fs.readJsonSync('../images.geojson');
const refs_geojson = fs.readJsonSync('../refs.geojson');
const books_geojson = fs.readJsonSync('../books.geojson');

const pois_json = geoJson2Json(pois_geojson, poisType());
const images_json = geoJson2Json(images_geojson, imagesType());
const refs_json = geoJson2Json(refs_geojson, refsType());
const books_json = geoJson2Json(books_geojson, booksType());
const pois_ws = XLSX.utils.json_to_sheet(pois_json);
const images_ws = XLSX.utils.json_to_sheet(images_json);
const refs_ws = XLSX.utils.json_to_sheet(refs_json);
const books_ws = XLSX.utils.json_to_sheet(books_json);

const pois_json2 = XLSX.utils.sheet_to_json(pois_ws);
const pois_geojson2 = json2GeoJson(pois_json2, "pois", poisType());
const images_json2 = XLSX.utils.sheet_to_json(images_ws);
const images_geojson2 = json2GeoJson(images_json2, "images", imagesType());
const refs_json2 = XLSX.utils.sheet_to_json(refs_ws);
const refs_geojson2 = json2GeoJson(refs_json2, "refs", refsType());
const books_json2 = XLSX.utils.sheet_to_json(books_ws);
const books_geojson2 = json2GeoJson(books_json2, "books", booksType());

book.Sheets["pois"] = pois_ws;
book.Sheets["images"] = images_ws;
book.Sheets["refs"] = refs_ws;
book.Sheets["books"] = books_ws;
XLSX.writeFile(book, "../tatebayashi_stones.xlsx");

fs.writeFileSync('../pois.geojson', savingGeoJson(pois_geojson2));
fs.writeFileSync('../images.geojson', savingGeoJson(images_geojson2));
fs.writeFileSync('../refs.geojson', savingGeoJson(refs_geojson2));
fs.writeFileSync('../books.geojson', savingGeoJson(books_geojson2));

function geoJson2Json(geojson, types) {
  return geojson.features.map((feature) => {
    const props = Object.assign({}, feature.properties);
    const geoms = feature.geometry;
    if (geoms) {
      props.longitude = geoms.coordinates[0];
      props.latitude = geoms.coordinates[1];
    }
    return types.reduce((prev, keyset) => {
      const old_key = keyset[0];
      const new_key = keyset[1];
      prev[new_key] = props[old_key];
      return prev;
    }, {});
  });
}

function json2GeoJson(jsons, table, types) {
  const geojson = {
    type: "FeatureCollection",
    name: table,
    crs: { type: "name", properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" } },
    features: []
  }
  return jsons.reduce((prev, json_base) => {
    const json = types.reduce((prev, keyset) => {
      const old_key = keyset[1];
      const new_key = keyset[0];
      prev[new_key] = json_base[old_key];
      return prev;
    }, {});
    if (prev.crs && (!json.longitude || !json.latitude)) {
      delete prev.crs;
    }
    const props = Object.assign({}, json);
    delete props.longitude;
    delete props.latitude;
    const geoms = json.longitude && json.latitude ? { type: "Point", coordinates: [ json.longitude, json.latitude ] } : null;
    prev.features.push({ type: "Feature", properties: props, geometry: geoms });
    return prev;
  }, geojson);
}

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

function imagesType() {
  return [
    ["fid", "ID", "n"],
    ["poi", "石造物ID", "n"],
    ["path", "画像パス", "s"],
    ["shootingDate", "撮影日", "s"],
    ["shooter", "撮影者", "s"],
    ["description", "説明", "s"],
    ["note", "ノート", "s"],
    ["mid_thumbnail", "中サイズサムネイル", "s"],
    ["small_thumbnail", "小サイズサムネイル", "s"]
  ];
}

function refsType() {
  return [
    ["fid", "ID", "n"],
    ["book", "書籍ID", "n"],
    ["poi", "石造物ID", "n"],
    ["description", "説明", "s"],
    ["note", "ノート", "s"],
    ["pages", "参照ページ", "s"]
  ];
}

function booksType() {
  return [
    ["fid", "ID", "n"],
    ["name", "書籍名", "s"],
    ["editor", "著者", "s"],
    ["publishedAt", "出版年", "s"],
    ["reference_type", "参照タイプ", "s"]
  ];
}

function savingGeoJson(geojson) {
  let ret = "{\n";
  Object.keys(geojson).forEach((key) => {
    if (key === 'features') return;
    ret += `"${key}": ${JSON.stringify(geojson[key])},\n`;
  })
  ret += `"features": [\n`;
  geojson.features.forEach((feature, index) => {
    const comma = geojson.features.length - 1 === index ? "" : ",";
    ret += `${JSON.stringify(feature)}${comma}\n`;
  });
  ret += "]\n";
  ret += "}";
  return ret;
}
