importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.2/workbox-sw.js');

const accessToken =
  "pk.eyJ1IjoicmVraXNoaWtva3VkbyIsImEiOiJjazRoMmF3dncwODU2M2ttdzI2aDVqYXVwIn0.8Hb9sekgjfck6Setxk5uVg";
const style = "mapbox://styles/moritoru/ck4s6w8bd0sb51cpp9vn7ztty";

workbox.core.skipWaiting();

workbox.core.clientsClaim();

workbox.navigationPreload.enable();

// ------------------  runtime caching starts ---------------------
// frequently updated resources
workbox.routing.registerRoute(
  new RegExp('tatebayashi_stones.geojson'),
  new workbox.strategies.NetworkFirst({
    cacheName: 'fetch-objects-cache',
  }),
  'GET'
);

// splash icon images
workbox.routing.registerRoute(
  new RegExp('icons/.*'),
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: 'icons',
    maxEntries: 50
  })
);

// manifest
workbox.routing.registerRoute(
  new RegExp('manifest.json'),
  new workbox.strategies.StaleWhileRevalidate()
);

// ------------------  precaching the assets ---------------------
workbox.precaching.precacheAndRoute([
  // html
  {'revision':'20230110', 'url':'index.html'},
  // js
  {'revision':'20230110', 'url':'https://unpkg.com/leaflet@1.9.3/dist/leaflet.js'},
  {'revision':'20230110', 'url':'https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.js'},
  {'revision':'20230110', 'url':'https://raw.githack.com/maplibre/maplibre-gl-leaflet/main/leaflet-maplibre-gl.js'},
  {'revision':'20230110', 'url':'https://unpkg.com/quyuanjs@0.1.0/umd/quyuan.min.js'},
  {'revision':'20230110', 'url':'src/popup_template.js'},
  {'revision':'20230110', 'url':'src/icon_template.js'},
  {'revision':'20230110', 'url':'src/twitter_Intent_url.js'},
  {'revision':'20230110', 'url':'src/oms.min.js'},
  {'revision':'20230110', 'url':'src/L.Control.Locate.js'},
  {'revision':'20230110', 'url':'src/main.js'},
  {'revision':'20230110', 'url':'src/twitter-text-3.1.0.min.js'},
  {'revision':'20230110', 'url':'https://unpkg.com/flatgeobuf@3.24.1/dist/flatgeobuf-geojson.min.js'},
  // css
  {'revision':'20230110', 'url':'https://cdnjs.cloudflare.com/ajax/libs/github-fork-ribbon-css/0.2.3/gh-fork-ribbon.min.css'},
  {'revision':'20230110', 'url':'https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css'},
  {'revision':'20230110', 'url':'https://unpkg.com/leaflet@1.9.3/dist/leaflet.css'},
  {'revision':'20230110', 'url':'https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.css'},
  {'revision':'20230110', 'url':'src/L.Control.Locate.min.css'},
  {'revision':'20230110', 'url':'src/style.css'},
  // other
  {'revision':'20230110', 'url':'manifest.json'},
  // image
  {'revision':'20230110', 'url':'assets/bato.png'},
  {'revision':'20230110', 'url':'assets/gorinto.png'},
  {'revision':'20230110', 'url':'assets/koshin.png'},
  {'revision':'20230110', 'url':'assets/nyoirin_missing.png'},
  {'revision':'20230110', 'url':'assets/stone_missing.png'},
  {'revision':'20230110', 'url':'assets/bato_action.png'},
  {'revision':'20230110', 'url':'assets/gorinto_action.png'},
  {'revision':'20230110', 'url':'assets/koshin_action.png'},
  {'revision':'20230110', 'url':'assets/nyorai.png'},
  {'revision':'20230110', 'url':'assets/ten_female.png'},
  {'revision':'20230110', 'url':'assets/bato_missing.png'},
  {'revision':'20230110', 'url':'assets/gorinto_missing.png'},
  {'revision':'20230110', 'url':'assets/koshin_missing.png'},
  {'revision':'20230110', 'url':'assets/nyorai_action.png'},
  {'revision':'20230110', 'url':'assets/ten_female_action.png'},
  {'revision':'20230110', 'url':'assets/bosatsu.png'},
  {'revision':'20230110', 'url':'assets/hokora.png'},
  {'revision':'20230110', 'url':'assets/kuyohi.png'},
  {'revision':'20230110', 'url':'assets/nyorai_missing.png'},
  {'revision':'20230110', 'url':'assets/ten_female_missing.png'},
  {'revision':'20230110', 'url':'assets/bosatsu_action.png'},
  {'revision':'20230110', 'url':'assets/hokora_action.png'},
  {'revision':'20230110', 'url':'assets/kuyohi_action.png'},
  {'revision':'20230110', 'url':'assets/sekijin.png'},
  {'revision':'20230110', 'url':'assets/ten_male.png'},
  {'revision':'20230110', 'url':'assets/bosatsu_missing.png'},
  {'revision':'20230110', 'url':'assets/hokora_missing.png'},
  {'revision':'20230110', 'url':'assets/kuyohi_missing.png'},
  {'revision':'20230110', 'url':'assets/sekijin_action.png'},
  {'revision':'20230110', 'url':'assets/ten_male_action.png'},
  {'revision':'20230110', 'url':'assets/chukonhi.png'},
  {'revision':'20230110', 'url':'assets/hokyoin.png'},
  {'revision':'20230110', 'url':'assets/mount.png'},
  {'revision':'20230110', 'url':'assets/sekijin_missing.png'},
  {'revision':'20230110', 'url':'assets/ten_male_missing.png'},
  {'revision':'20230110', 'url':'assets/chukonhi_action.png'},
  {'revision':'20230110', 'url':'assets/hokyoin_action.png'},
  {'revision':'20230110', 'url':'assets/mount_action.png'},
  {'revision':'20230110', 'url':'assets/sekishi.png'},
  {'revision':'20230110', 'url':'assets/tree.png'},
  {'revision':'20230110', 'url':'assets/chukonhi_missing.png'},
  {'revision':'20230110', 'url':'assets/hokyoin_missing.png'},
  {'revision':'20230110', 'url':'assets/mount_missing.png'},
  {'revision':'20230110', 'url':'assets/sekishi_action.png'},
  {'revision':'20230110', 'url':'assets/tree_action.png'},
  {'revision':'20230110', 'url':'assets/dohyo.png'},
  {'revision':'20230110', 'url':'assets/itahi.png'},
  {'revision':'20230110', 'url':'assets/myogo.png'},
  {'revision':'20230110', 'url':'assets/sekishi_missing.png'},
  {'revision':'20230110', 'url':'assets/tree_missing.png'},
  {'revision':'20230110', 'url':'assets/dohyo_action.png'},
  {'revision':'20230110', 'url':'assets/itahi_action.png'},
  {'revision':'20230110', 'url':'assets/myogo_action.png'},
  {'revision':'20230110', 'url':'assets/shomen.png'},
  {'revision':'20230110', 'url':'assets/tsukimachi.png'},
  {'revision':'20230110', 'url':'assets/dohyo_missing.png'},
  {'revision':'20230110', 'url':'assets/itahi_missing.png'},
  {'revision':'20230110', 'url':'assets/myogo_missing.png'},
  {'revision':'20230110', 'url':'assets/shomen_action.png'},
  {'revision':'20230110', 'url':'assets/tsukimachi_action.png'},
  {'revision':'20230110', 'url':'assets/dosojin.png'},
  {'revision':'20230110', 'url':'assets/jizo.png'},
  {'revision':'20230110', 'url':'assets/myooh.png'},
  {'revision':'20230110', 'url':'assets/shomen_missing.png'},
  {'revision':'20230110', 'url':'assets/tsukimachi_missing.png'},
  {'revision':'20230110', 'url':'assets/dosojin_action.png'},
  {'revision':'20230110', 'url':'assets/jizo_action.png'},
  {'revision':'20230110', 'url':'assets/myooh_action.png'},
  {'revision':'20230110', 'url':'assets/shrine.png'},
  {'revision':'20230110', 'url':'assets/ukibori_gorin.png'},
  {'revision':'20230110', 'url':'assets/dosojin_missing.png'},
  {'revision':'20230110', 'url':'assets/jizo_missing.png'},
  {'revision':'20230110', 'url':'assets/myooh_missing.png'},
  {'revision':'20230110', 'url':'assets/shrine_action.png'},
  {'revision':'20230110', 'url':'assets/ukibori_gorin_action.png'},
  {'revision':'20230110', 'url':'assets/fujiko.png'},
  {'revision':'20230110', 'url':'assets/kinenhi.png'},
  {'revision':'20230110', 'url':'assets/new.png'},
  {'revision':'20230110', 'url':'assets/shrine_missing.png'},
  {'revision':'20230110', 'url':'assets/ukibori_gorin_missing.png'},
  {'revision':'20230110', 'url':'assets/fujiko_action.png'},
  {'revision':'20230110', 'url':'assets/kinenhi_action.png'},
  {'revision':'20230110', 'url':'assets/nyoirin.png'},
  {'revision':'20230110', 'url':'assets/stone.png'},
  {'revision':'20230110', 'url':'assets/fujiko_missing.png'},
  {'revision':'20230110', 'url':'assets/kinenhi_missing.png'},
  {'revision':'20230110', 'url':'assets/nyoirin_action.png'},
  {'revision':'20230110', 'url':'assets/stone_action.png'},
  {'revision':'20230110', 'url':'icons/favicon-196.png'},
  {'revision':'20230110', 'url':'icons/apple-icon-180.png'},
  {'revision':'20230110', 'url':'icons/apple-splash-2048-2732.jpg'},
  {'revision':'20230110', 'url':'icons/apple-splash-2732-2048.jpg'},
  {'revision':'20230110', 'url':'icons/apple-splash-1668-2388.jpg'},
  {'revision':'20230110', 'url':'icons/apple-splash-2388-1668.jpg'},
  {'revision':'20230110', 'url':'icons/apple-splash-1536-2048.jpg'},
  {'revision':'20230110', 'url':'icons/apple-splash-2048-1536.jpg'},
  {'revision':'20230110', 'url':'icons/apple-splash-1668-2224.jpg'},
  {'revision':'20230110', 'url':'icons/apple-splash-2224-1668.jpg'},
  {'revision':'20230110', 'url':'icons/apple-splash-1620-2160.jpg'},
  {'revision':'20230110', 'url':'icons/apple-splash-2160-1620.jpg'},
  {'revision':'20230110', 'url':'icons/apple-splash-1284-2778.jpg'},
  {'revision':'20230110', 'url':'icons/apple-splash-2778-1284.jpg'},
  {'revision':'20230110', 'url':'icons/apple-splash-1170-2532.jpg'},
  {'revision':'20230110', 'url':'icons/apple-splash-2532-1170.jpg'},
  {'revision':'20230110', 'url':'icons/apple-splash-1125-2436.jpg'},
  {'revision':'20230110', 'url':'icons/apple-splash-2436-1125.jpg'},
  {'revision':'20230110', 'url':'icons/apple-splash-1242-2688.jpg'},
  {'revision':'20230110', 'url':'icons/apple-splash-2688-1242.jpg'},
  {'revision':'20230110', 'url':'icons/apple-splash-828-1792.jpg'},
  {'revision':'20230110', 'url':'icons/apple-splash-1792-828.jpg'},
  {'revision':'20230110', 'url':'icons/apple-splash-1242-2208.jpg'},
  {'revision':'20230110', 'url':'icons/apple-splash-2208-1242.jpg'},
  {'revision':'20230110', 'url':'icons/apple-splash-750-1334.jpg'},
  {'revision':'20230110', 'url':'icons/apple-splash-1334-750.jpg'},
  {'revision':'20230110', 'url':'icons/apple-splash-640-1136.jpg'},
  {'revision':'20230110', 'url':'icons/apple-splash-1136-640.jpg'}
]);