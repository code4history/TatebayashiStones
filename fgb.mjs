import { geojson } from "flatgeobuf";
import { readFileSync, writeFileSync }  from 'fs';

const gj = JSON.parse(readFileSync("./tatebayashi_stones.geojson"));

const flatgeobuf = geojson.serialize(gj);
console.log(`Serialized input GeoJson into FlatGeobuf (${flatgeobuf.length} bytes)`);

writeFileSync('./tatebayashi_stones.fgb', flatgeobuf);
const buffer = readFileSync('./tatebayashi_stones.fgb');
const actual = geojson.deserialize(new Uint8Array(buffer));

console.log('FlatGeobuf deserialized back into GeoJSON:')
writeFileSync('./tatebayashi_stones_rt.geojson', JSON.stringify(actual, undefined, 1));