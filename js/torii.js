const ExifImage = require('exif').ExifImage;
const XLSX = require("xlsx");
const fs = require('fs-extra');
const argv = require('argv');
const Jimp = require('jimp');

const settings = require('../torii.json');

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

module.exports = async function (fromXlsx) {
  const book = XLSX.readFile("../tatebayashi_stones.xlsx");

  // Read from xlsx
  const pois_ws = book.Sheets["pois"];
  const images_ws = book.Sheets["images"];
  const refs_ws = book.Sheets["refs"];
  const books_ws = book.Sheets["books"];

  // Read from qgis
  const pois_gj = fs.readJsonSync('../pois.geojson');
  const images_gj = fs.readJsonSync('../images.geojson');
  const refs_gj = fs.readJsonSync('../refs.geojson');
  const books_gj = fs.readJsonSync('../books.geojson');

  // Create common json
  let pois_js, images_js, refs_js, books_js;
  if (fromXlsx) {
    pois_js = ws2Json(pois_ws, settings['pois'].attrs);
    images_js = ws2Json(images_ws, settings['images'].attrs);
    refs_js = ws2Json(refs_ws, settings['refs'].attrs);
    books_js = ws2Json(books_ws, settings['books'].attrs);
  } else {
    pois_js = geoJson2Json(pois_gj);
    images_js = geoJson2Json(images_gj);
    refs_js = geoJson2Json(refs_gj);
    books_js = geoJson2Json(books_gj);
  }

  // Image check
  let max_img_id;
  // Images list from Geojson
  const im_list_js = images_js.map((img) => {
    if (!max_img_id || max_img_id < img.fid) max_img_id = img.fid;
    return img.path;
  });

  // Images list from FS
  const im_list_fs = fs.readdirSync('../images').reduce((arr, imgid) => {
    if (imgid === '.DS_Store') return arr;
    fs.readdirSync(`../images/${imgid}`).forEach((imgFile) => {
      arr.push(`./images/${imgid}/${imgFile}`);
    });
    return arr;
  }, []);

  // Check missing
  for (let i = im_list_js.length - 1; i >= 0; i--) {
    const im_js = im_list_js[i];
    const fs_id = im_list_fs.indexOf(im_js);
    if (fs_id >= 0) {
      delete im_list_js[i];
      delete im_list_fs[fs_id];
    }
  }

  for (let i = im_list_fs.length - 1; i >= 0; i--) {
    const im_fs = im_list_fs[i];
    const js_id = im_list_js.indexOf(im_fs);
    if (js_id >= 0) {
      delete im_list_fs[i];
      delete im_list_js[js_id];
    }
  }

  const js_remains = im_list_js.filter(x=>x);
  const fs_remains = im_list_fs.filter(x=>x).filter(x=>!x.match(/\.DS_Store$/));

  if (!fs_remains.length) {
    console.log('No new images.');
  } else {
    const new_imgs = await fs_remains.reduce(async (promise_buf, new_img) => {
      console.log(new_img);
      const buf = await promise_buf;
      const paths = new_img.split("/");
      const poi_id = parseInt(paths[2]);
      const poi = pois_js.reduce((prev, poi) => {
        if (poi.fid === poi_id) return poi;
        else return prev;
      }, null);

      const date = gdate ? gdate : await new Promise((res, _rej) => {
        new ExifImage({ image : `.${new_img}` }, (_err, exif_data) => {
          const date = exif_data.exif ? exif_data.exif.DateTimeOriginal.replace(/^(\d{4}):(\d{2}):(\d{2}) /, "$1-$2-$3T") : '';
          res(date);
        });
      });

      const fid = ++max_img_id;
      let path = new_img;
      if (!buf[poi_id]) buf[poi_id] = {
        images: []
      };
      if (paths[3].match(/^PRIM\./)) {
        paths[3] = paths[3].replace(/^PRIM\./, '');
        path = paths.join('/');
        buf[poi_id].primary_image = fid;
      }
      if (paths[3].match(/\.jpe?g$/i)) {
        paths[3] = paths[3].replace(/\.jpe?g$/i, '.jpg');
        path = paths.join('/');
      }
      const mid_thumb = path.replace('./images', './mid_thumbs');
      const small_thumb = path.replace('./images', './small_thumbs');

      await new Promise((resolve, reject) => {
        try {
          fs.statSync(`.${mid_thumb}`);
          resolve();
        } catch (e) {
          fs.ensureFileSync(`.${mid_thumb}`);
          Jimp.read(`.${new_img}`, (err, jimp) => {
            if (err) {
              console.log('Error 2: ' + err.message);
              reject(err);
              return;
            }
            jimp
              .scaleToFit(800, 800, Jimp.RESIZE_BICUBIC) // resize
              .write(`.${mid_thumb}`); // save
            resolve();
          });
        }
      });
      await new Promise((resolve, reject) => {
        try {
          fs.statSync(`.${small_thumb}`);
          resolve();
        } catch (e) {
          fs.ensureFileSync(`.${small_thumb}`);
          Jimp.read(`.${new_img}`, (err, jimp) => {
            if (err) {
              console.log('Error 2: ' + err.message);
              reject(err);
              return;
            }
            jimp
              .scaleToFit(200, 200, Jimp.RESIZE_BICUBIC) // resize
              .write(`.${small_thumb}`); // save
            resolve();
          });
        }
      });
      if (new_img !== path) {
        fs.moveSync(`.${new_img}`, `.${path}`);
      }

      buf[poi_id].images.push({
        fid,
        poi: poi_id,
        path,
        shooting_date: date,
        shooter,
        description: poi.name,
        note: '',
        mid_thumbnail: mid_thumb,
        small_thumbnail: small_thumb
      });
      return buf;
    }, Promise.resolve({}));

    Object.keys(new_imgs).forEach((poi_id_str) => {
      const poi_id = parseInt(poi_id_str);
      const poi = pois_js.reduce((prev, poi) => {
        if (poi.fid === poi_id) return poi;
        else return prev;
      }, null);
      const new_poi = new_imgs[poi_id_str];
      if (new_poi.primary_image) poi.primary_image = new_poi.primary_image;
      else if (!poi.primary_image) poi.primary_image = new_poi.images[0].fid;
      new_poi.images.forEach((image) => {
        images_js.push(image);
      })
    });
  }

  // Reflect to xlsx
  book.Sheets["pois"] = json2Ws(pois_js, settings['pois'].attrs);
  book.Sheets["images"] = json2Ws(images_js, settings['images'].attrs);
  book.Sheets["refs"] = json2Ws(refs_js, settings['refs'].attrs);
  book.Sheets["books"] = json2Ws(books_js, settings['books'].attrs);
  XLSX.writeFile(book, "../tatebayashi_stones.xlsx");

  // Reflect to qgis
  const pois_gj_op = json2GeoJson(pois_js, "pois");
  const images_gj_op = json2GeoJson(images_js, "images");
  const refs_gj_op = json2GeoJson(refs_js, "refs");
  const books_gj_op = json2GeoJson(books_js, "books");
  fs.writeFileSync('../pois.geojson', savingGeoJson(pois_gj_op));
  fs.writeFileSync('../images.geojson', savingGeoJson(images_gj_op));
  fs.writeFileSync('../refs.geojson', savingGeoJson(refs_gj_op));
  fs.writeFileSync('../books.geojson', savingGeoJson(books_gj_op));

  // Create merged geojson
  pois_gj_op.features.forEach((poi) => {
    const props = poi.properties;
    const poiid = props.fid;

    props.path = '';
    props.mid_thumbnail = '';
    props.small_thumbnail = '';

    props.images = images_gj_op.features.map(x => x.properties).filter((image) => {
      return image.poi === poiid;
    }).sort((a, b) => {
      if (a.fid === props.primary_image) {
        return -1;
      } else if (b.fid === props.primary_image) {
        return 1;
      } else {
        return 0;
      }
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

    props.books = refs_gj_op.features.map(x => x.properties).filter((ref) => {
      return ref.poi === poiid;
    }).map((ref) => {
      const ret = Object.assign({}, ref);
      const book = books_gj_op.features.map(x => x.properties).reduce((prev, book) => {
        return ref.book === book.fid ? book : prev;
      }, undefined);
      delete ret.poi;
      delete ret.fid;
      delete ret.book
      ret.name = book.name;
      ret.editor = book.editor;
      ret.published_at = book.published_at;
      ret.reference_type = book.reference_type;
      return ret;
    });
  });

  fs.writeFileSync('../tatebayashi_stones.geojson', savingGeoJson(pois_gj_op));
};

function ws2Json(ws, types) {
  const json = XLSX.utils.sheet_to_json(ws, {raw: true, defval:null});
  return json.map((each) => {
    return types.reduce((prev, keyset) => {
      const old_key = keyset[1];
      const new_key = keyset[0];
      prev[new_key] = each[old_key];
      return prev;
    }, {});
  }).sort((a, b) => {
    if (a.fid < b.fid) {
      return -1;
    }
    if (a.fid > b.fid) {
      return 1;
    }
    return 0;
  });
}

function json2Ws(json, types) {
  return XLSX.utils.json_to_sheet(json.map((each) => {
    return types.reduce((prev, keyset) => {
      const old_key = keyset[0];
      const new_key = keyset[1];
      prev[new_key] = each[old_key];
      return prev;
    }, {});
  }));
}

function geoJson2Json(geojson) {
  return geojson.features.map((feature) => {
    const props = Object.assign({}, feature.properties);
    const geoms = feature.geometry;
    if (geoms) {
      props.longitude = geoms.coordinates[0];
      props.latitude = geoms.coordinates[1];
    }
    return props;
  }).sort((a, b) => {
    if (a.fid < b.fid) {
      return -1;
    }
    if (a.fid > b.fid) {
      return 1;
    }
    return 0;
  });
}

function json2GeoJson(jsons, table) {
  const geojson = {
    type: "FeatureCollection",
    name: table,
    crs: { type: "name", properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" } },
    features: []
  };
  return jsons.reduce((prev, json) => {
    if (prev.crs && (!json.longitude || !json.latitude)) {
      delete prev.crs;
    }
    const props = Object.assign({}, json);
    delete props.longitude;
    delete props.latitude;
    const geoms = json.longitude && json.latitude ? { type: "Point", coordinates: [ json.longitude, json.latitude ] } : null;
    prev.features.push({ type: "Feature", properties: props, geometry: geoms });
    return prev;
  }, geojson);
}

function savingGeoJson(geojson) {
  let ret = "{\n";
  Object.keys(geojson).forEach((key) => {
    if (key === 'features') return;
    ret += `"${key}": ${JSON.stringify(geojson[key])},\n`;
  })
  ret += `"features": [\n`;
  geojson.features.forEach((feature, index) => {
    const comma = geojson.features.length - 1 === index ? "" : ",";
    ret += `${JSON.stringify(feature)}${comma}\n`;
  });
  ret += "]\n";
  ret += "}";
  return ret;
}
