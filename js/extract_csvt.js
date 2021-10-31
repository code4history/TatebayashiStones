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

module.exports = extractCsvt;