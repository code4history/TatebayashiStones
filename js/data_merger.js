const fs = require('fs-extra');
const readline = require('linebyline');
const csvtojson = require('csvtojson/v1');
const helpers = require('@turf/helpers');
const featureCollection = helpers.featureCollection;
const feature = helpers.feature;

const extractCsvt = async (filenameroot) => {
  return new Promise(async (res) => {
    const collection = [];
    // Create attributes - types table
    const csvrl = readline(`${filenameroot}.csv`);
    const csvtrl = readline(`${filenameroot}.csvt`);

    const csvPromise = new Promise((res_) => {
      csvrl.once('line', (line, lineCount, byteCount) => {
        res_(line);
      });
    });
    const csvtPromise = new Promise((res_) => {
      csvtrl.once('line', (line, lineCount, byteCount) => {
        res_(line);
      });
    });
    const csvas = (await csvPromise).split(',');
    const csvts = (await csvtPromise).split(',');
    const attrTypes = csvas.reduce((prev, curr, index) => {
      prev[curr] = csvts[index];
      return prev;
    }, {});

    // Read csv to json
    csvtojson()
      .fromFile(`${filenameroot}.csv`)
      .on('json',(jsonObj)=>{
        let geom;
        const prop = {};
        Object.keys(jsonObj).forEach((key) => {
          if (key == 'X' || key == 'Y') {
            if (!geom) {
              geom = {
                "type": "Point",
                "coordinates": [parseFloat(jsonObj['X']), parseFloat(jsonObj['Y'])]
              };
            }
            return;
          }
          const type = attrTypes[key];
          if (key == 'fid') {
            prop[key] = parseInt(jsonObj[key]);
          } else if (type === 'Real') {
            prop[key] = jsonObj[key] == '' ? '' : parseFloat(jsonObj[key]);
          } else if (type.match(/^Integer/)) {
            prop[key] = jsonObj[key] == '' ? '' : parseInt(jsonObj[key]);
          } else {
            prop[key] = jsonObj[key] == 'TRUE' ? true :
              jsonObj[key] == 'FALSE' ? false : jsonObj[key];
          }
        });

        const pt = feature(geom, prop);
        collection.push(pt);
      })
      .on('done',(error)=>{
        res(featureCollection(collection));
      });
  });
};

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




