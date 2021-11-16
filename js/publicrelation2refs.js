const fs = require('fs-extra');

const pois = fs.readJsonSync('../pois.geojson');
const refs = fs.readJsonSync('../refs.geojson');

const book_id = 9;

let max_fid = refs.features.reduce((prev, curr) => {
  const curr_id = curr.properties.fid;
  return curr_id > prev ? curr_id : prev;
}, 0);

console.log(max_fid);

const pubrels = pois.features.filter((feature) => {
  const pubrel = feature.properties.public_relations;
  return pubrel !== '';
});

pubrels.forEach((pubrel) => {
  max_fid++;
  refs.features.push({
    type: "Feature",
    properties: {
      fid: max_fid,
      book: book_id,
      poi: pubrel.properties.fid,
      description: "",
      note: "",
      pages: pubrel.properties.public_relations
    },
    geometry: null
  });
});

console.log(refs);
fs.writeJsonSync('../refs.geojson', refs, {
  spaces: '  '
});