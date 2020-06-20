const fs = require('fs-extra');

const pois = fs.readJsonSync('../pois.geojson');
const files = fs.readJsonSync('../files.geojson');

const filesBuffer = {};
files.features.map((curr) => {
    if (!filesBuffer[curr.properties.poiid]) {
        filesBuffer[curr.properties.poiid] = [];
    }
    filesBuffer[curr.properties.poiid].push(curr);
});
pois.features.map((poi) => {
    if (filesBuffer[poi.properties.fid]) {
        poi.properties.files = filesBuffer[poi.properties.fid];
    }
});
fs.writeJsonSync('../tatebayashi_stones.geojson', pois, {
    spaces: '  '
});