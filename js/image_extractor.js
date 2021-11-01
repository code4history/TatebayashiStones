const ExifImage = require('exif').ExifImage;
const fsp = require('fs').promises;
const fs = require('fs-extra');
const argv = require('argv');
const stringify = require('csv-stringify');
const parse = require('csv-parse');
const readline = require('linebyline');

//const pois = fs.readJsonSync('../pois.geojson');
//const images = fs.readJsonSync('../images.geojson');
const sharp = require('sharp');
const args = argv.option([
  {
    "name": "shooter",
    "short": "s",
    "type": "string",
    "description": "新規写真の撮影者を設定します",
    "example": "'script --shooter=\"value\"' or 'script -s \"value\"'"
  },
  {
    "name": "date",
    "short": "d",
    "type": "string",
    "description": "新規写真の年月日を設定します",
    "example": "'script --date=\"value\"' or 'script -d \"value\"'"
  }
]).run();
const shooter = args.options.shooter || 'Shooter not reported - must update';
const gdate = args.options.date;

const doWork = async () => {
  // Create attributes - types table
  const pcsvtrl = readline('../pois.csvt');
  const icsvtrl = readline('../images.csvt');

  const pcsvtPromise = new Promise((res_) => {
    pcsvtrl.once('line', (line, lineCount, byteCount) => {
      res_(line);
    });
  });
  const icsvtPromise = new Promise((res_) => {
    icsvtrl.once('line', (line, lineCount, byteCount) => {
      res_(line);
    });
  });
  const pcsvts = (await pcsvtPromise).split(',');
  const icsvts = (await icsvtPromise).split(',');

  const pcsvtx = await fs.readFile('../pois.csv', 'utf8');
  const icsvtx = await fs.readFile('../images.csv', 'utf8');

  const parserp = parse({
    delimiter: ','
  });
  const parseri = parse({
    delimiter: ','
  });

  const promisep = new Promise((res_) => {
    const output = [];
    parserp.on('readable', function(){
      let record
      let first = false;
      while (record = parserp.read()) {
        if (!first) {
          first = true;
        } else {
          record = record.map((col, index) => {
            const type = pcsvts[index];
            if (col == '') {
              return col;
            } else if (type.match(/^Integer/)) {
              return parseInt(col);
            } else if (type.match(/^Coord/) || type == 'Real') {
              return parseFloat(col);
            } else {
              return col;
            }
          });
        }
        output.push(record);
      }
    });
    // Catch any error
    parserp.on('error', function(err){
      console.error(err.message)
    });
    // When we are done, test that the parsed output matched what expected
    parserp.on('end', function(){
      res_(output);
    });
  });

  let maxImageId;
  const jsonList = [];
  const promisei = new Promise((res_) => {
    const output = [];
    parseri.on('readable', function(){
      let record
      let first = false;
      while (record = parseri.read()) {
        if (!first) {
          first = true;
        } else {
          record = record.map((col, index) => {
            const type = icsvts[index];
            if (col == '') {
              return col;
            } else if (type.match(/^Integer/)) {
              return parseInt(col);
            } else if (type.match(/^Coord/) || type == 'Real') {
              return parseFloat(col);
            } else {
              return col;
            }
          });
          if (!maxImageId || maxImageId < record[0]) maxImageId = record[0];
          jsonList.push(record[2]);
        }
        output.push(record);
      }
    });
    // Catch any error
    parseri.on('error', function(err){
      console.error(err.message)
    });
    // When we are done, test that the parsed output matched what expected
    parseri.on('end', function(){
      res_(output);
    });
  });

  parserp.write(pcsvtx);
  parseri.write(icsvtx);
  parserp.end();
  parseri.end();

  const retp = await promisep;
  const reti = await promisei;

  //console.log(retp);
  //console.log(reti);

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
    const poi = retp.reduce((prev, poi) => {
      if (poi[0] === poiid) return poi;
      else return prev;
    }, null);

    const date = gdate ? gdate : await new Promise((res, _rej) => {
      new ExifImage({ image : `.${newImg}` }, (_err, exifData) => {
        const date = exifData.exif ? exifData.exif.DateTimeOriginal.replace(/^(\d{4}):(\d{2}):(\d{2}) /, "$1-$2-$3T") : '';
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

    // fid,poi,path,shootingDate,shooter,description,note,mid_thumbnail,small_thumbnail
    buf[poiid].images.push([
      fid,
      poiid,
      path,
      date,
      shooter,
      poi[4],
      '',
      mid_thumb,
      small_thumb
    ]);
    return buf;
  }, Promise.resolve({}));

  Object.keys(newImages).forEach((poiid_str) => {
    const poiid = parseInt(poiid_str);
    const poi = retp.reduce((prev, poi) => {
      if (poi[0] === poiid) return poi;
      else return prev;
    }, null);
    const newPoi = newImages[poiid_str];
    // ここから下
    if (newPoi.primary_image) poi[20] = newPoi.primary_image;
    else if (!poi[20]) poi[20] = newPoi.images[0][0];
    newPoi.images.forEach((image) => {
      reti.push(image);
    })
  });

  const datap = [];
  const stringifierp = stringify({
    delimiter: ","
  });
  stringifierp.on("readable", () => {
    let row;
    while ((row = stringifierp.read())) {
      datap.push(row);
    }
  });
  stringifierp.on("error", (err) => {
    console.error(err.message);
  });
  stringifierp.on("finish", () => {
    fs.writeFileSync("../pois_new.csv", datap.join(""));
  });
  retp.forEach((poi) => {
    stringifierp.write(poi);
  });
  stringifierp.end();

  const datai = [];
  const stringifieri = stringify({
    delimiter: ","
  });
  stringifieri.on("readable", () => {
    let row;
    while ((row = stringifieri.read())) {
      datai.push(row);
    }
  });
  stringifieri.on("error", (err) => {
    console.error(err.message);
  });
  stringifieri.on("finish", () => {
    fs.writeFileSync("../images_new.csv", datai.join(""));
  });
  reti.forEach((image) => {
    stringifieri.write(image);
  });
  stringifieri.end();
};

doWork();

/*async function doWork() {
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

doWork();*/