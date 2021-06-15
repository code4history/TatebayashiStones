const fs = require('fs-extra');

const pois = fs.readJsonSync('../pois.geojson');
const images = fs.readJsonSync('../images.geojson');
const refs = fs.readJsonSync('../refs.geojson');
const books = fs.readJsonSync('../books.geojson');

refs.features.forEach((ref) => {
  const poiid = ref.properties.poi;
  const poiarr = pois.features.filter((poi) => {
    return poi.properties.fid === poiid;
  });

  if (poiarr.length === 0) {
    console.log(`No POI: ref_id ${ref.properties.fid}`);
  } else if (poiarr.length > 1) {
    console.log(`Too many POI: ref_id ${ref.properties.fid}, POIs: ${poiarr.map(x => x.properties.fid)}`);
  }
});
