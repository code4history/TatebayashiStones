const ExifImage = require('exif').ExifImage;
const XLSX = require("xlsx");
const fs = require('fs-extra');
const argv = require('argv');
const Jimp = require('jimp');
const path = require('path');

const geojson_template = {
  type: "FeatureCollection",
  crs: { type: "name", properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" } },
  features: []
};

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
  },
  {
    "name": "config",
    "short": "c",
    "type": "string",
    "description": "設定ファイルを指定します",
    "example": "'script --config=\"value\"' or 'script -c \"value\"'"
  }
]).run();
const shooter = args.options.shooter || 'Shooter not reported - must update';
const gdate = args.options.date;
const ndate = (new Date(Date.now() + 9 * 60 * 60 * 1000)).toISOString().replace(/\.\d+Z$/, "");
const script_path = path.dirname(process.argv[1].match(/^(?:C:)?[\\\/]snapshot[\\\/]/) ? process.argv[0] : process.argv[1]);
const config_file = path.resolve(script_path, args.options.config || './torii.json');
const settings = fs.readJsonSync(config_file);
const file_path = path.resolve(path.dirname(config_file), settings.base_folder || '../');
const xlsx_file = path.resolve(file_path, settings.xlsx_file || 'torii.xlsx');
const geojson_file = path.resolve(file_path, settings.geojson_file || 'torii.geojson');
const tables = settings.tables;
const table_keys = Object.keys(tables);
const mid_json = {};
let new_xlsx;

const poi_table_key = table_keys.reduce((prev, key) => {
  const table = tables[key];
  const attrs = table.attrs;
  return attrs.reduce((prev, attr) => {
    return (attr[0] === 'latitude' || attr[0] === 'longitude') ? true : prev;
  }, false) ? key : prev;
}, undefined);

const image_table_key = table_keys.reduce((prev, key) => {
  return tables[key].thumbnails ? key : prev;
}, undefined);
const image_sort_topid = image_table_key ?
  tables[image_table_key].image_sort && tables[image_table_key].image_sort.priority_key ?
  tables[image_table_key].image_sort.priority_key : "primary_image" : "";
const original_attr_key = image_table_key ? tables[image_table_key].path || "path" : "";
const thumbnails = image_table_key ? tables[image_table_key].thumbnails : [];

module.exports = async function (fromXlsx) {
  // Read from xlsx
  const book = await new Promise((res) => {
    try {
      const ret = XLSX.readFile(xlsx_file);
      new_xlsx = false;
      res(ret);
    } catch(e) {
      const ret = XLSX.utils.book_new();
      new_xlsx = true;
      res(ret);
    }
  });

  // Create common json
  if (fromXlsx) {
    table_keys.forEach((key) => {
      const ws = book.Sheets[key];
      mid_json[key] = ws2Json(ws, tables[key].attrs);
    });
  } else {
    table_keys.forEach((key) => {
      try {
        const gj = fs.readJsonSync(path.resolve(file_path, `${key}.geojson`));
        mid_json[key] = geoJson2Json(gj);
      } catch (e) {
        mid_json[key] = {};
      }
    });
  }

  if (image_table_key) {
    const defaults = tables[image_table_key].defaults;
    const image_sort_prefix = tables[image_table_key].image_sort && tables[image_table_key].image_sort.priority_prefix ?
      tables[image_table_key].image_sort.priority_prefix : "PRIM.";

    // Image check
    let max_img_id;
    // Images list from Geojson
    const im_list_js = mid_json[image_table_key].map((img) => {
      if (!max_img_id || max_img_id < img.fid) max_img_id = img.fid;
      return img.path;
    });

    // Images list from FS
    const im_list_fs = fs.readdirSync(path.resolve(file_path, `./${image_table_key}`)).reduce((arr, imgid) => {
      if (imgid === '.DS_Store') return arr;
      fs.readdirSync(path.resolve(file_path, `./${image_table_key}/${imgid}`)).forEach((imgFile) => {
        arr.push(`./${image_table_key}/${imgid}/${imgFile}`);
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
        const poi = mid_json[poi_table_key].reduce((prev, poi) => {
          if (poi.fid === poi_id) return poi;
          else return prev;
        }, null);

        const date = gdate ? gdate : await new Promise((res, _rej) => {
          new ExifImage({ image : path.resolve(file_path, new_img) }, (_err, exif_data) => {
            const date = exif_data && exif_data.exif && exif_data.exif.DateTimeOriginal ?
              exif_data.exif.DateTimeOriginal.replace(/^(\d{4}):(\d{2}):(\d{2}) /, "$1-$2-$3T") : ndate;
            res(date);
          });
        });

        const fid = ++max_img_id;
        let ni_path = new_img;
        if (!buf[poi_id]) buf[poi_id] = {
          images: []
        };
        const prim_prefix = new RegExp(`^${image_sort_prefix}`);
        if (paths[3].match(prim_prefix)) {
          paths[3] = paths[3].replace(prim_prefix, '');
          ni_path = paths.join('/');
          buf[poi_id][image_sort_topid] = fid;
        }
        if (paths[3].match(/\.jpe?g$/i)) {
          paths[3] = paths[3].replace(/\.jpe?g$/i, '.jpg');
          ni_path = paths.join('/');
        }

        const new_record = {};
        new_record[original_attr_key] = ni_path;
        new_record["fid"] = fid;
        Object.keys(defaults).forEach((key) => {
          const def = defaults[key];
          if (def.match(/^(poi|info)\.(.+)$/)) {
            const domain = RegExp.$1;
            const type = RegExp.$2;
            if (domain === 'poi') {
              new_record[key] = poi[type];
            } else {
              new_record[key] = type === 'shooting_date' ? date : type === 'shooter' ? shooter : '';
            }
          } else {
            new_record[key] = def;
          }
        });
        await Promise.all(thumbnails.map(async (thumbnail) => {
          const thumb_key = thumbnail[0];
          const pixels = thumbnail[1];
          new_record[thumb_key] = ni_path.replace(`./${image_table_key}`, `./${thumb_key}`);
          await new Promise((resolve, reject) => {
            try {
              fs.statSync(path.resolve(file_path, new_record[thumb_key]));
              resolve();
            } catch (e) {
              fs.ensureFileSync(path.resolve(file_path, new_record[thumb_key]));
              Jimp.read(path.resolve(file_path, new_img), (err, jimp) => {
                if (err) {
                  console.log('Error 2: ' + err.message);
                  reject(err);
                  return;
                }
                jimp
                  .scaleToFit(pixels, pixels, Jimp.RESIZE_BICUBIC) // resize
                  .write(path.resolve(file_path, new_record[thumb_key])); // save
                resolve();
              });
            }
          });
        }));
        if (new_img !== ni_path) {
          fs.moveSync(path.resolve(file_path, new_img), path.resolve(file_path, ni_path));
        }

        buf[poi_id].images.push(tables[image_table_key].attrs.reduce((prev, attr) => {
          prev[attr[0]] = new_record[attr[0]];
          return prev;
        }, {}));
        return buf;
      }, Promise.resolve({}));

      Object.keys(new_imgs).forEach((poi_id_str) => {
        const poi_id = parseInt(poi_id_str);
        const poi = mid_json[poi_table_key].reduce((prev, poi) => {
          if (poi.fid === poi_id) return poi;
          else return prev;
        }, null);
        const new_poi = new_imgs[poi_id_str];
        if (new_poi[image_sort_topid]) poi[image_sort_topid] = new_poi[image_sort_topid];
        else if (!poi[image_sort_topid]) poi[image_sort_topid] = new_poi.images[0].fid;
        new_poi.images.forEach((image) => {
          mid_json[image_table_key].push(image);
        })
      });
    }
  }

  // Reflect to xlsx
  table_keys.forEach((key) => {
    if (new_xlsx) {
      XLSX.utils.book_append_sheet(book, json2Ws(mid_json[key], tables[key].attrs), key);
    } else {
      book.Sheets[key] = json2Ws(mid_json[key], tables[key].attrs);
    }
  });
  XLSX.writeFile(book, xlsx_file);

  // Reflect to qgis
  const gj = {};
  table_keys.forEach((key) => {
    gj[key] = json2GeoJson(mid_json[key], key);
    fs.writeFileSync(path.resolve(file_path, `./${key}.geojson`), savingGeoJson(gj[key]));
  });

  // Create merged geojson
  // Link
  table_keys.forEach((key) => {
    const merge = tables[key].merge || {};
    const link_ids = Object.keys(merge).filter(key => {
      return merge[key].link;
    });

    gj[key].features.map(feature => {
      const props = feature.properties;

      if (key === poi_table_key && image_table_key) {
        props[original_attr_key] = '';
        thumbnails.forEach((tmbs) => {
          props[tmbs[0]] = '';
        });
      }

      link_ids.forEach((lid) => {
        const merge_setting = merge[lid];
        const target = merge_setting.target || lid;
        const parent_keys = Object.keys(merge_setting.link);
        const child_keys = parent_keys.map((key) => { return merge_setting.link[key]; });
        const multiple = merge_setting.multiple || false;
        props[lid] = gj[target].features.map((feature_) => {
          return feature_.properties;
        }).reduce((prev, props_) => {
          const flag = parent_keys.reduce((prev_, pkey, index) => {
            const ckey = child_keys[index];
            return prev_ && (props[pkey] === props_[ckey]);
          }, true);
          if (flag) {
            if (multiple) {
              prev.push(props_);
              return prev;
            } else {
              return props_;
            }
          } else {
            return prev;
          }
        }, multiple ? [] : {});
        if (key === poi_table_key && target === image_table_key && multiple) {
          props[lid] = props[lid].sort((a, b) => {
            if (a.fid === props[image_sort_topid]) {
              return -1;
            } else if (b.fid === props[image_sort_topid]) {
              return 1;
            } else {
              return 0;
            }
          });
          const prim_image = props[lid][0];
          if (prim_image) {
            props[original_attr_key] = prim_image[original_attr_key];
            thumbnails.forEach((tmbs) => {
              props[tmbs[0]] = prim_image[tmbs[0]];
            });
          }
        }
      });
    });
  });

  // Copy
  table_keys.forEach((key) => {
    const merge = tables[key].merge || {};
    const copy_ids = Object.keys(merge).filter(key => {
      return merge[key].copy;
    });

    gj[key].features.map(feature => {
      const props = feature.properties;

      copy_ids.forEach((cid) => {
        merge[cid].copy.match(/^([^\.]+)\.(.+)$/);
        const ctable = RegExp.$1;
        const ctable_key = RegExp.$2;
        props[cid] = props[ctable][ctable_key];
      });
    });
  });

  // Delete
  table_keys.forEach((key) => {
    const merge = tables[key].merge || {};
    const del_ids = Object.keys(merge).filter(key => {
      return merge[key].delete;
    });

    gj[key].features.map(feature => {
      const props = feature.properties;

      del_ids.forEach((did) => {
        delete props[did];
      });
    });
  });

  fs.writeFileSync(geojson_file, savingGeoJson(gj[poi_table_key]));
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
  ret = ret.replace(/\\r(\\n)?/g, "\\n");
  return ret;
}
