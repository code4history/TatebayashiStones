const ExifImage = require('exif').ExifImage;
const fs = require('fs-extra');
const argv = require('argv')
const pois = fs.readJsonSync('../pois.geojson');
const images = fs.readJsonSync('../images.geojson');
const sharp = require('sharp');
const args = argv.option([
  {
    "name": "shooter",
    "short": "s",
    "type": "string",
    "description": "新規写真の撮影者を設定します",
    "example": "'script --shooter=\"value\"' or 'script -s \"value\"'"
  }
]).run();
const shooter = args.options.shooter || 'Kohei Otsuka';//'Shooter not reported - must update';
async function doWork() {
  let maxImageId;
  // Images list from Geojson
  const jsonList = images.features.map((img) => {
    if (!maxImageId || maxImageId < img.properties.fid) maxImageId = img.properties.fid;
    return img.properties.path;
  });

  // Images list from FS
  const fsList = fs.readdirSync('../images').reduce((arr, imgid) => {
    if (imgid === '.DS_Store') return arr;
    fs.readdirSync(`../images/${imgid}`).forEach((imgFile) => {
      arr.push(`./images/${imgid}/${imgFile}`);
    });
    return arr;
  }, []);

  for (let i = jsonList.length - 1; i >= 0; i--) {
    const jsonImg = jsonList[i];
    const fsid = fsList.indexOf(jsonImg);
    if (fsid >= 0) {
      delete jsonList[i];
      delete fsList[fsid];
    }
  }

  for (let i = fsList.length - 1; i >= 0; i--) {
    const fsImg = fsList[i];
    const jsonid = jsonList.indexOf(fsImg);
    if (jsonid >= 0) {
      delete fsList[i];
      delete jsonList[jsonid];
    }
  }

  const jsonRemains = jsonList.filter(x=>x);
  const fsRemains = fsList.filter(x=>x).filter(x=>!x.match(/\.DS_Store$/));

  if (!fsRemains.length) {
    console.log('No new images. finished.');
    return;
  }

  const newImages = await fsRemains.reduce(async(prms_buf, newImg) => {
    console.log(newImg);
    const buf = await prms_buf;
    const pathes = newImg.split("/");
    const poiid = parseInt(pathes[2]);
    const poi = pois.features.reduce((prev, poi) => {
      if (poi.properties.fid === poiid) return poi;
      else return prev;
    }, null);

    const date = await new Promise((res, _rej) => {
      new ExifImage({ image : `.${newImg}` }, (_err, exifData) => {
        const date = exifData.exif.DateTimeOriginal.replace(/^(\d{4}):(\d{2}):(\d{2}) /, "$1-$2-$3T");
        res(date);
      });
    });

    const fid = ++maxImageId;
    let path = newImg;
    if (!buf[poiid]) buf[poiid] = {
      images: []
    };
    if (pathes[3].match(/^PRIM\./)) {
      pathes[3] = pathes[3].replace(/^PRIM\./, '');
      path = pathes.join('/');
      buf[poiid].primary_image = fid;
    }
    if (pathes[3].match(/\.jpe?g$/i)) {
      pathes[3] = pathes[3].replace(/\.jpe?g$/i, '.jpg');
      path = pathes.join('/');
    }
    const mid_thumb = path.replace('./images', './mid_thumbs');
    const small_thumb = path.replace('./images', './small_thumbs');

    await new Promise((resolve, reject) => {
      try {
        fs.statSync(`.${mid_thumb}`);
        resolve();
      } catch (e) {
        fs.ensureFileSync(`.${mid_thumb}`);
        sharp(`.${newImg}`)
          .resize(800, 800, {
            kernel: sharp.kernel.nearest,
            fit: sharp.fit.inside
          })
          .withMetadata()
          .toFile(`.${mid_thumb}`)
          .then(() => {
            resolve();
          }).catch ((error) => {
            console.log('Error 2: ' + error.message);
            reject();
          });
      }
    });
    await new Promise((resolve, reject) => {
      try {
        fs.statSync(`.${small_thumb}`);
        resolve();
      } catch (e) {
        fs.ensureFileSync(`.${small_thumb}`);
        sharp(`.${newImg}`)
          .resize(200, 200, {
            kernel: sharp.kernel.nearest,
            fit: sharp.fit.inside
          })
          .withMetadata()
          .toFile(`.${small_thumb}`)
          .then(() => {
            resolve();
          }).catch ((error) => {
            console.log('Error 2: ' + error.message);
            reject();
          });
      }
    });
    if (newImg !== path) {
      fs.moveSync(`.${newImg}`, `.${path}`);
    }

    buf[poiid].images.push({
      poi: poiid,
      path,
      shootingDate: date,
      shooter,
      description: poi.properties.name,
      note: '',
      fid,
      mid_thumbnail: mid_thumb,
      small_thumbnail: small_thumb
    });
    return buf;
  }, Promise.resolve({}));

  Object.keys(newImages).forEach((poiid_str) => {
    const poiid = parseInt(poiid_str);
    const poi = pois.features.reduce((prev, poi) => {
      if (poi.properties.fid === poiid) return poi;
      else return prev;
    }, null);
    const newPoi = newImages[poiid_str];
    if (newPoi.primary_image) poi.properties.primary_image = newPoi.primary_image;
    else if (!poi.properties.primary_image) poi.properties.primary_image = newPoi.images[0].fid;
    newPoi.images.forEach((image) => {
      images.features.push({
        type: "Feature",
        properties: image,
        geometry: null
      });
    })
  });

  try {
    fs.writeJsonSync('../pois.geojson', pois, {spaces: '  '});
  } catch(e) {
    console.log('Cannot save to pois.geojson directly. Save to pois_new.geojson.');
    fs.writeJsonSync('../pois_new.geojson', pois, {spaces: '  '});
  }
  try {
    fs.writeJsonSync('../images.geojson', images, {spaces: '  '});
  } catch(e) {
    console.log('Cannot save to images.geojson directly. Save to images_new.geojson.');
    fs.writeJsonSync('../images_new.geojson', images, {spaces: '  '});
  }
}

doWork();