const fs = require('fs-extra');
const helpers = require('@turf/turf').helpers;
const path = require('path');
const sharp = require('sharp');

const akb_pois = loadGeojson('./pois.geojson');
const akb_files = loadGeojson('./files.geojson');
const all_pois = loadGeojson('./GunmaNetwork/pois.geojson');
const all_refs = loadGeojson('./GunmaNetwork/refs.geojson');
const all_books = loadGeojson('./GunmaNetwork/books.geojson');
const all_images = loadGeojson('./GunmaNetwork/images.geojson');

// 1) all_imagesにfidを追加
//const image_arr = all_images.features;
//image_arr.forEach((image, index) => {
//  image.properties.fid = index + 1;
//  if (image.properties.shootingDate) {
//  	image.properties.shootingDate = image.properties.shootingDate.replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1/$2/$3");
//  } else {
//    console.log(image.properties.path);
//  }
//});
//fs.writeFileSync('./GunmaNetwork/images_new.geojson', JSON.stringify(all_images, null, "  "));
// Done!

// 2) 二重計上されている地物をピックアップ
//const buffer = all_pois.features.reduce((buffer, poi) => {
//  if(poi.properties.akabane_ver_id) {
//  	if (!buffer[poi.properties.akabane_ver_id]) buffer[poi.properties.akabane_ver_id] = [];
//  	buffer[poi.properties.akabane_ver_id].push(poi);
//  }
//  return buffer;
//}, {});
//Object.keys(buffer).forEach((key) => {
//  if (buffer[key].length > 1) console.log(`Duplicated POI: ${key}: ${buffer[key].map(poi => poi.properties.fid)}`)
//});
// Done!

// 3) 赤羽調査との相互参照を確認
//akb_pois.features.forEach((akb) => {
//  const all_id = akb.properties.all_ver_id;
//  if (!all_id) return;
//  const all = filterAllPoi(all_id);
//  const akb_id = all.properties.akabane_ver_id;
//  if (akb_id !== akb.properties.fid) console.log(`Error: AkbOrigin: ${akb.properties.fid} All: ${all_id} Akb: ${akb_id}`);
//})
//all_pois.features.forEach((all) => {
//  const akb_id = all.properties.akabane_ver_id;
//  if (!akb_id) return;
//  const akb = filterAkbPoi(akb_id);
//  const all_id = akb.properties.all_ver_id;
//  if (all_id !== all.properties.fid) console.log(`Error: AllOrigin: ${all.properties.fid} Akb: ${akb_id} All: ${all_id}`);
//})

// 4) 赤羽調査のマージ
//let maxid = maxAllFid();
//akb_pois.features.forEach((akb) => {
//  if (!akb.geometry) {
//  	console.log(`No Geometry: ${akb.properties.fid}`);
//  	return;
//  }
//  const all_id = akb.properties.all_ver_id;
//  let all;
//  if (all_id) {
//    all = filterAllPoi(all_id);
//  } else {
//    maxid++;
//    all = helpers.point(akb.geometry.coordinates, {
//      fid: maxid,
//      area_no: undefined,
//      name: akb.properties.name,
//      type: "",
//      era: "",
//      year: undefined,
//      place_1: "",
//      place_2: "",
//      detail: "",
//      note_1: "",
//      note_2: "",
//      note_3: "",
//      area: "赤羽",
//      surveyed: "",
//      description: "",
//      photo: "",
//      public_relations: "",
//      height: undefined,
//      width: undefined,
//      depth: undefined,
//      akabane_ver_id: akb.properties.fid,
//    });
//    all_pois.features.push(all);
//  }
//  Object.keys(akb.properties).forEach((key) => {
//    if (key === 'fid' || key === 'all_ver_id') return;
//    all.properties[`akb_${key}`] = akb.properties[key];
//  })
//});
//fs.writeFileSync('./GunmaNetwork/pois_new.geojson', JSON.stringify(all_pois, null, "  "));
// pois.geojson => pois_old.geojsonへ

// 5) データ整理
/*all_pois.features.
  filter(poi => poi.properties.akabane_ver_id).
  forEach((poi) => {
  	const props = poi.properties;
    //年代チェック
    if (props.year && props.akb_year && parseInt(props.year) !== parseInt(props.akb_year)) {
      console.log(`Year Error: ${props.fid} ${props.name} All: ${props.year}(${props.era}) Akb: ${props.akb_year}(${props.akb_japanese_calendar})`);
    }
    if (props.era && props.akb_japanese_calendar && props.era !== props.akb_japanese_calendar) {
      console.log(`Era Error: ${props.fid} ${props.name} All: ${props.year}(${props.era}) Akb: ${props.akb_year}(${props.akb_japanese_calendar})`);
    }
    if ((!props.era && props.akb_japanese_calendar) || (!props.year && props.akb_year)) {
      console.log(`Missing Error: ${props.fid} ${props.name} All: ${props.year}(${props.era}) Akb: ${props.akb_year}(${props.akb_japanese_calendar})`);
    }
    delete props.akb_year;
    delete props.akb_japanese_calendar;

    //note, descriptionをチェック
    if (props.note_3 && props.akb_note) {
      console.log(`Note is not empty: ${props.fid} ${props.name} All: "${props.note_3}" Akb: "${props.akb_note}"`);
    }
    //if (props.description && props.akb_note) {
    //  console.log(`Description is not empty: ${props.fid} ${props.name} All: "${props.description}" Akb: "${props.akb_note}"`);
    //}
    if (!props.note_1) props.note_1 = props.akb_note;
    else if (!props.note_2) props.note_2 = props.akb_note;
    else props.note_3 = props.akb_note;
    delete props.akb_note;

    //諸元をチェック
    if (props.width && props.width !== props.akb_width) {
      console.log(`Width is different: ${props.fid} ${props.name} All: "${props.width}" Akb: "${props.akb_width}"`);
    }
    if (props.height && props.width !== props.akb_whole_height) {
      console.log(`Height is different: ${props.fid} ${props.name} All: "${props.height}" Akb: "${props.akb_whole_height}"`);
    }
    if (props.height && props.depth !== props.akb_depth) {
      console.log(`Depth is different: ${props.fid} ${props.name} All: "${props.depth}" Akb: "${props.akb_depth}"`);
    }
    props.width = props.akb_width;
    props.height = props.akb_whole_height;
    props.depth = props.akb_depth;
    props.statue_height = props.akb_statue_height;
    delete props.akb_width;
    delete props.akb_whole_height;
    delete props.akb_depth;
    delete props.akb_statue_height;

    //種別、所在地などをチェック
    props.shape = props.akb_shape;
    delete props.akb_shape;
    if (props.type && props.akb_type && props.type.indexOf(props.akb_type) < 0) {
      //console.log(`Type is different: ${props.fid} ${props.name} All: "${props.type}" Akb: "${props.akb_type}"`);
      if (props.type.match(/(立|座|半跏)像/)) {
        if (props.shape) {
          props.shape = `${props.shape},${props.type}`;
        } else {
          props.shape = props.type;
        }
        props.type = props.akb_type;
      } else {
      	props.type = `${props.type},${props.akb_type}`;
      }
    } else if (!props.type) props.type = props.akb_type;
    delete props.akb_type;
    if (props.detail && props.akb_place) {
      if (!(props.akb_place.indexOf(props.detail) > -1 && props.akb_place.indexOf(props.place_2) > -1)) {
      	console.log(`Place is different: ${props.fid} ${props.name} All: "${props.place_1} / ${props.place_2} / ${props.detail}" Akb: "${props.akb_place}"`);
      }
    } else if (!props.detail && props.akb_place) {
      if (props.place_2 !== props.akb_place) {
      	if (!props.akb_place.match(/(上)?赤生田(山田|侍辺|中新田|大林)?/)) {
      	  console.log(`Place is missing: ${props.fid} ${props.name} All: "${props.place_1} / ${props.place_2} / ${props.detail}" Akb: "${props.akb_place}"`);
      	}
      }
    }
    delete props.akb_place;

    //対応済み
    delete props.akb_name;
    //そのまま移せるもの
    props.inscription = props.akb_inscription;
    delete props.akb_inscription;
    props.color = props.akb_color;
    delete props.akb_color;
    props.material = props.akr_material;
    delete props.akr_material;
    if (props.akb_confirmed) {
      props.surveyed = props.akb_confirmed.replace(/\-/g, "/");
      props.confirmed = true;
    }
    delete props.akb_confirmed;
    props.status = props.akb_status;
    delete props.akb_status;
    props.material = props.akb_material;
    delete props.akb_material;
    props.contradiction = props.akb_contradiction;
    delete props.akb_contradiction;
    props.need_action = props.akb_need_action;
    delete props.akb_need_action;
  });

fs.writeFileSync('./GunmaNetwork/pois_new.geojson', JSON.stringify(all_pois, null, "  "));*/
// pois.geojson => pois_old2.geojsonへ

// 6) データ整理
/*async function go() {
  const promises = [];
  all_pois.features.forEach((poi) => {
    const props = poi.properties;
    const refs = all_refs.features;
    if (props.akabane_ver_id) {
  	  const akb_id = props.akabane_ver_id;
      const filtered_refs = refs.filter((ref) => {
        const ps = ref.properties;
        return ps.poi === props.fid && ps.book === 7;
      });
      if (filtered_refs.length) {
        if (filtered_refs.length > 1) {
          //console.log(`2 refs, please check: ${props.fid} ${props.name}`);
        } else {
      	  if (!props.akb_book_page) console.log(`No book page, please check: ${props.fid} ${props.name}`);
      	  else {
      	    filtered_refs[0].properties.page = props.akb_book_page;
      	  }
        }
      }

      let maxImgId = all_images.features.reduce((prev, img) => {
        return prev < img.properties.fid ? img.properties.fid : prev;
      }, 0);
      const oldimgs = akb_files.features.filter((img) => {
        return img.properties.poiid === akb_id;
      });
      oldimgs.forEach((oldimg) => {
        maxImgId++;
        if (oldimg.properties.fid === props.akb_primary_image) props.primary_image = maxImgId;
        const newIdPath = oldimg.properties.path.replace(`${akb_id}`, `${props.fid}`);
        const newMidPath = oldimg.properties.mid_thumbnail.replace(`${akb_id}`, `${props.fid}`);
        const newSmallPath = oldimg.properties.small_thumbnail.replace(`${akb_id}`, `${props.fid}`);
        const newimg = {
          type: "Feature",
          properties: {
            poi: props.fid,
            path: newIdPath,
            mid_thumbnail: newMidPath,
            small_thumbnail: newSmallPath,
            shootingDate: oldimg.properties.date,
            shooter: oldimg.properties.author,
            description: oldimg.properties.description,
            note: "",
            fid: maxImgId
          },
          geometry: null
        };
        all_images.features.push(newimg);
        fs.copySync(oldimg.properties.path, path.resolve('GunmaNetwork', newIdPath));
        fs.copySync(oldimg.properties.mid_thumbnail, path.resolve('GunmaNetwork', newMidPath));
        fs.copySync(oldimg.properties.small_thumbnail, path.resolve('GunmaNetwork', newSmallPath));
      });
      delete props.akb_primary_image;
      delete props.akb_book_page;
      delete props.akb_map_page;
      delete props.akb_book_id;
      delete props.akb_table_id;
      delete props.akabane_ver_id;
    } else {
      const images = all_images.features.filter((img) => {
        return img.properties.poi === props.fid;
      });
      if (images.length > 0) {
        if (images.length > 1) console.log(`2 or more images: ${props.fid} ${props.name}`);
        const newIdPath = images[0].properties.path.replace('./images/', `./images/${props.fid}/`);
        const newMidPath = images[0].properties.path.replace('./images/', `./mid_thumbs/${props.fid}/`);
        const newSmallPath = images[0].properties.path.replace('./images/', `./small_thumbs/${props.fid}/`);
        const oldResolve = path.resolve('GunmaNetwork', images[0].properties.path);
        fs.copySync(oldResolve, path.resolve('GunmaNetwork', newIdPath));
        promises.push(new Promise((resolve) => {
          const newMidResolve = path.resolve('GunmaNetwork', newMidPath);
          fs.ensureFileSync(newMidResolve);
          sharp(oldResolve).resize(800, 800, {
            kernel: sharp.kernel.nearest,
            fit: sharp.fit.inside
          }).withMetadata().toFile(newMidResolve).then(() => {
            resolve();
          }).catch ((error) => {
            console.log('Error 2: ' + error.message);
            reject();
          });
        }));
        promises.push(new Promise((resolve) => {
          const newSmallResolve = path.resolve('GunmaNetwork', newSmallPath);
          fs.ensureFileSync(newSmallResolve);
          sharp(oldResolve).resize(200, 200, {
            kernel: sharp.kernel.nearest,
            fit: sharp.fit.inside
          }).withMetadata().toFile(newSmallResolve).then(() => {
            resolve();
          }).catch ((error) => {
            console.log('Error 2: ' + error.message);
            reject();
          });
        }));
        images[0].properties.path = newIdPath;
        images[0].properties.mid_thumbnail = newMidPath;
        images[0].properties.small_thumbnail = newSmallPath;
        images[0].properties.description = props.name;
        props.primary_image = images[0].properties.fid;
      } else {
        // console.log(`No image: ${props.fid} ${props.name}`);
      }
    }
  });
  await Promise.all(promises);
  fs.writeFileSync('./GunmaNetwork/refs_new.geojson', JSON.stringify(all_refs, null, "  "));
  fs.writeFileSync('./GunmaNetwork/images_new.geojson', JSON.stringify(all_images, null, "  "));
  fs.writeFileSync('./GunmaNetwork/pois_new.geojson', JSON.stringify(all_pois, null, "  "));
}
go();*/
// pois.geojson => pois_old3.geojsonへ
// images.geojson => images_old2.geojsonへ
// refs.geojson => refs_old.geojsonへ

function loadGeojson(file) {
  const text = fs.readFileSync(file, 'utf-8');
  const geojson = JSON.parse(text);
  return geojson;
}

function filterAkbPoi(fid) {
  return akb_pois.features.reduce((prev, poi) => {
    if (prev) return prev;
    if (poi.properties.fid === fid) return poi;
  }, undefined);
}

function filterAllPoi(fid) {
  return all_pois.features.reduce((prev, poi) => {
    if (prev) return prev;
    if (poi.properties.fid === fid) return poi;
  }, undefined);
}

function maxAllFid() {
  return all_pois.features.reduce((prev, poi) => {
    return poi.properties.fid > prev ? poi.properties.fid : prev;
  }, 0);
}
