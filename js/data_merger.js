const fs = require('fs-extra');
const extractCsvt = require('./extract-csvt');

const doWork = async () => {
  const pois = await extractCsvt('../pois');
  const images = await extractCsvt('../images');
  const refs = await extractCsvt('../refs');
  const books = await extractCsvt('../books');

  pois.features.forEach((poi) => {
    const props = poi.properties;
    const poiid = props.fid;

    props.path = '';
    props.mid_thumbnail = '';
    props.small_thumbnail = '';

    props.images = images.features.map(x => x.properties).filter((image) => {
      return image.poi === poiid;
    }).map((image) => {
      if (image.fid === props.primary_image) {
        props.path = image.path;
        props.mid_thumbnail = image.mid_thumbnail;
        props.small_thumbnail = image.small_thumbnail;
      }
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

    ['status', 'shape', 'material', 'inscription', 'need_action', 'contradiction', 'type', 'year'].forEach((key) => {
      if (typeof props[key] === "undefined" || props[key] === null) props[key] = '';
    });
    ['height', 'statue_height', 'width', 'depth'].forEach((key) => {
      if (typeof props[key] === "undefined") props[key] = null;
    });
  });
  fs.writeJsonSync('../tatebayashi_stones.geojson', pois, {
    spaces: '  '
  });
};

doWork();




