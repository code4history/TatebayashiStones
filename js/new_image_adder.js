const ExifImage = require('exif').ExifImage;
const fs = require('fs-extra');
const sharp = require('sharp');

const files = fs.readJsonSync('../files.geojson');
const new_files = Object.assign({}, files);
new_files.features = [];
const fileBuffer = files.features.reduce((prev, curr) => {
    prev[curr.properties.path] = 1;
    return prev;
}, {});

const imageRoot = './images';
const folders = fs.readdirSync(`.${imageRoot}`);
const fileNew =[];

folders.map((folder) => {
    if (folder.match(/^\./)) return;
    const folderPath = `${imageRoot}/${folder}`;
    let description = {};
    try {
        description = fs.readJsonSync(`.${folderPath}/description.json`);
    } catch(e) {
    }
    const images = fs.readdirSync(`.${folderPath}`);
    images.map((image) => {
        if (image.match(/^\./)) return;
        if (image == 'description.json') return;
        const imagePath = `${folderPath}/${image}`;
        if (fileBuffer[imagePath]) return;
        fileNew.push({
            path: imagePath,
            description: description[image],
            poiid: parseInt(folder)
        });
    });
});

console.log(fileNew);

const promises = fileNew.map((curr) => {
    const path = curr.path;
    const mid_thumb = path.replace('./images', './mid_thumbs');
    const small_thumb = path.replace('./images', './small_thumbs');
    return Promise.all([
        new Promise((resolve, reject) => {
            try {
                new ExifImage({ image : `.${path}` }, function (error, exifData) {
                    if (error) {
                        console.log('Error 1: ' + error.message + path);
                        reject();
                        return;
                    } else {
                        let date = exifData.exif.DateTimeOriginal;
                        if (date) {
                            date = date.replace(/^(\d{4}):(\d{2}):(\d{2}) /, "$1/$2/$3 ");
                        }
                        const author = 'Kohei Otsuka';
                        resolve({
                            "type": "Feature",
                            "properties": {
                                "fid": null,
                                "poiid": curr.poiid,
                                "description": curr.description,
                                "path": curr.path,
                                "date": date,
                                "author": author,
                                "mid_thumbnail": mid_thumb,
                                "small_thumbnail": small_thumb
                            },
                            "geometry": null
                        });
                    }
                });
            } catch (error) {
                console.log('Error 2: ' + error.message);
                reject();
            }
        }),
        new Promise((resolve) => {
            try {
                fs.statSync(`.${mid_thumb}`);
            } catch (e) {
                fs.ensureFileSync(`.${mid_thumb}`);
                sharp(`.${path}`)
                    .resize(800, 800, {
                        kernel: sharp.kernel.nearest,
                        fit: sharp.fit.inside
                    })
                    .withMetadata()
                    .toFile(`.${mid_thumb}`)
                    .then(() => {
                        curr.mid_thumbnail = mid_thumb;
                        resolve();
                    });
            };
        }),
        new Promise((resolve) => {
            try {
                fs.statSync(`.${small_thumb}`);
            } catch (e) {
                fs.ensureFileSync(`.${small_thumb}`);
                sharp(`.${path}`)
                    .resize(200, 200, {
                        kernel: sharp.kernel.nearest,
                        fit: sharp.fit.inside
                    })
                    .withMetadata()
                    .toFile(`.${small_thumb}`)
                    .then(() => {
                        curr.small_thumbnail = small_thumb;
                        resolve();
                    });
            };
        })
    ]);
});

Promise.all(promises).then((features) => {
    new_files.features = features.map(feature => feature[0]);
    fs.writeJsonSync('../files_new.geojson', new_files, {
        spaces: '  '
    });
});