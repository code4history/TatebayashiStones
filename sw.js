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
    workbox.strategies.networkFirst({
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
    'index.html',
    // js
    'https://unpkg.com/leaflet@1.6.0/dist/leaflet-src.js',
    'https://api.tiles.mapbox.com/mapbox-gl-js/v1.5.0/mapbox-gl.js',
    'https://unpkg.com/mapbox-gl-leaflet/leaflet-mapbox-gl.js',
    'https://unpkg.com/quyuanjs@0.0.6/dist/quyuan.min.js',
    'assets/popup_template.js',
    'assets/icon_template.js',
    'assets/twitter_Intent_url.js',
    'assets/oms.min.js',
    'assets/L.Control.Locate.js',
    // css
    'https://cdnjs.cloudflare.com/ajax/libs/github-fork-ribbon-css/0.2.3/gh-fork-ribbon.min.css',
    'https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css',
    'https://unpkg.com/leaflet@1.6.0/dist/leaflet.css',
    'https://api.tiles.mapbox.com/mapbox-gl-js/v1.5.0/mapbox-gl.css',
    'assets/L.Control.Locate.min.css',
    'assets/style.css',
    // other
    'manifest.json'
]);