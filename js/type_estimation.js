const fs = require('fs-extra');

const pois = fs.readJsonSync('../pois.geojson');
const images = fs.readJsonSync('../images.geojson');
const refs = fs.readJsonSync('../refs.geojson');
const books = fs.readJsonSync('../books.geojson');

pois.features.forEach((poi) => {
  const props = poi.properties;
  const poiid = props.fid;
  if (props.area === '赤羽') {
    // console.log('赤羽');
    return;
  }
  if (props.type.match(/像/) || props.type.match(/半/)) {
    props.type = props.type.match(/半/) ? '半跏像' : props.type;
    if (props.type.match(/道標/)) {
      props.type = '道標';
      props.shape = props.shape ? `${props.shape},立像` : '立像';
    } else {
      props.shape = props.type;
      props.type = '';
    }
  }

  if (!props.name.match(/碑$/)) {
    if (props.name.match(/地蔵/)) {
      props.type = props.type ? `${props.type},地蔵菩薩像` : '地蔵菩薩像';
      //console.log(props);
    }
    if (props.name.match(/如意輪/)) {
      props.type = props.type ? `${props.type},如意輪観音像` : '如意輪観音像';
      //console.log(props);
    }
    if (props.name.match(/(庚申|青面金剛|猿田彦)/)) {
      props.type = props.type ? `${props.type},庚申` : '庚申';
      //console.log(props);
    }
    if (props.name.match(/如来/)) {
      props.type = props.type ? `${props.type},如来像` : '如来像';
      //console.log(props);
    }
    if (props.name.match(/馬頭/)) {
      props.type = props.type ? `${props.type},馬頭観世音` : '馬頭観世音';
      //console.log(props);
    }
    if (props.name.match(/(聖|十一面)観世?音/)) {
      props.type = props.type ? `${props.type},菩薩像` : '菩薩像';
      //console.log(props);
    }
    if (props.name.match(/明王/)) {
      props.type = props.type ? `${props.type},明王像` : '明王像';
      //console.log(props);
    }
    if (props.name.match(/二?十[一-九]?夜/)) {
      props.type = props.type ? `${props.type},月待塔` : '月待塔';
      //console.log(props);
    }
    if (props.name.match(/道標/) && !props.type.match(/道標/)) {
      props.type = props.type ? `${props.type},道標` : '道標';
      console.log(props);
    }
  }
});
fs.writeJsonSync('../pois.geojson', pois, {
  spaces: '  '
});