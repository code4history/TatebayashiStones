const fs = require('fs-extra');

const pois = fs.readJsonSync('../pois.geojson');
const images = fs.readJsonSync('../images.geojson');
const refs = fs.readJsonSync('../refs.geojson');
const books = fs.readJsonSync('../books.geojson');

pois.features.forEach((poi) => {
  const props = poi.properties;
  const poiid = props.fid;
  props.images = images.features.map(x => x.properties).filter((image) => {
    return image.poi === poiid;
  }).map((image) => {
    const ret = Object.assign({}, image);
    delete ret.poi;
    delete ret.fid;
    return ret;
  });

  props.books = refs.features.map(x => x.properties).filter((ref) => {
    return ref.poi === poiid;
  }).map((ref) => {
    const ret = Object.assign({}, ref);
    const book = books.features.map(x => x.properties).reduce((prev, book) => {
      return ref.book === book.fid ? book : prev;
    }, undefined);
    delete ret.poi;
    delete ret.fid;
    delete ret.book
    ret.name = book.name;
    ret.editor = book.editor;
    ret.publishedAt = book.publishedAt;
    return ret;
  });
});
fs.writeJsonSync('../tatebayashi_stones.geojson', pois, {
  spaces: '  '
});