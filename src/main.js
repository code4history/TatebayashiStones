window.addEventListener('load', function() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register("sw.js")
      .then(function(registration) {
        console.log("sw registed.");
      }).catch(function(error) {
      console.warn("sw error.", error);
    });
  }
});
const accessToken =
  "pk.eyJ1IjoicmVraXNoaWtva3VkbyIsImEiOiJjazRoMmF3dncwODU2M2ttdzI2aDVqYXVwIn0.8Hb9sekgjfck6Setxk5uVg";
const style = "mapbox://styles/moritoru/ck4s6w8bd0sb51cpp9vn7ztty";
const latLng = [36.2461984, 139.5278149];
const zoom = 15;
const minZoom = 5;
const maxZoom = 21;
const twitInit = `\n==\n* 上下の==の間を消して説明を投稿してください、その外は修正しないでください\n* 添付された写真はCreative Commons 4.0 BY-SAの条件で誰でも使えるオープンデータになることを了承されたものとみなします\n==\n`;
const hashTags = ['館林石仏'];
const geoJson = "tatebayashi_stones.geojson";
const mymap = L.map("mapid", {
  maxZoom: maxZoom,
}).setView(latLng, zoom);
const roundDec = (val, level) => {
  const powVal = Math.pow(10, level);
  return Math.round(val * powVal) / powVal;
};
L.mapboxGL({
  accessToken: accessToken,
  style: style,
  maxZoom: maxZoom,
  minZoom: minZoom,
}).addTo(mymap);
L.control
  .locate({
    icon: "fa fa-crosshairs",
  })
  .addTo(mymap);
// see here: https://github.com/Fallstop/OverlappingMarkerSpiderfier-Leaflet#construction
const oms = new OverlappingMarkerSpiderfier(mymap, L, {
  keepSpiderfied: true,
});
let lastClickedMarker = null;
let lastClickedMarkerOriginalPopupContent = null;
let lastClickedMarkerOriginalLatlng = null;
let isEditingMarker = false;
let spiderfyStatus = false;
fetch(geoJson)
  .then(async (data) => data.json())
  .then((geojson) => {
    return Quyuan.templateExtractor({
      geojson,
      templates: {
        pin: iconTemplate,
        html: popupHtmlTemplate,
      },
      options: {
        nunjucks: true,
      }
    });
  })
  .then((geojson) => {
    const confirmed = L.layerGroup([]);
    const nonconfirmed = L.layerGroup([]);
    Quyuan.setUpModalForViewer("modalbase");
    const container = document.querySelector('#container');
    const pane = container.querySelector("#poipane");
    const close_button = pane.querySelector(".poipane-close-button");
    const poi_content = pane.querySelector(".poipane-content");
    close_button.addEventListener("click", () => {
      container.classList.toggle('open');
      container.classList.toggle('close');
      poi_content.innerHTML = "";
    });
    geojson.features.forEach((feature) => {
      if (feature.geometry) {
        const icons = feature.result.pin.split(',');
        const iconUrl = icons[0];
        const width = parseInt(icons[1]);
        const height = parseInt(icons[2]);
        const iconOptions = {
          iconUrl,
          iconSize: [width, height],
          iconAnchor: [width / 2, height],
          popupAnchor: [0, -1 * height],
        };
        // source file coordinates are ordered by lnglat, but should be latlng.
        const marker = L.marker(feature.geometry.coordinates.reverse(), {
          icon: L.icon(iconOptions),
        });
        marker.html = feature.result.html;
        marker.addTo(feature.properties.confirmed ? confirmed : nonconfirmed);
        /*marker.getPopup().on('remove', (e) => {
          container.classList.toggle('open');
          container.classList.toggle('close');
        });*/
        oms.addMarker(marker);
      }
    });
    oms.addListener("click", (marker) => {
      poi_content.innerHTML = marker.html;
      container.classList.add('open');
      container.classList.remove('close');

      if (!isEditingMarker) {
        lastClickedMarker = marker;
        lastClickedMarkerOriginalLatlng = marker.getLatLng();
      }
      const slideCount = document.querySelectorAll(
        ":scope .swiper .swiper-slide"
      ).length;
      Quyuan.createSwiper({
        loop: slideCount > 1
      });
    });
    L.control.layers(null, {
      "現況確認済み": confirmed,
      "未確認(情報募集中)": nonconfirmed
    }, {
      position: "bottomright"
    }).addTo(mymap);
    confirmed.addTo(mymap);
  });
oms.addListener("spiderfy", (markers) => {
  spiderfyStatus = true;
  mymap.closePopup();
});
oms.addListener("unspiderfy", (markers) => {
  setTimeout(() => {
    spiderfyStatus = false;
  }, 100)
});
const hiddenMarkers = () => {
  mymap.eachLayer((layer) => {
    if (layer.options.icon instanceof L.Icon) {
      layer._hiddenForApplyPoi = true;
      layer.getElement().style.visibility = "hidden";
    }
  });
};
const visibleMarkers = () => {
  mymap.eachLayer((layer) => {
    if (layer._hiddenForApplyPoi) {
      layer._hiddenForApplyPoi = false;
      layer.getElement().style.visibility = "visible";
    }
  });
};
let newMarker = null;
const removeNewMarker = () => {
  if (newMarker) {
    mymap.removeLayer(newMarker);
    newMarker = null;
  }
};
const prepareEditMarker = (poiId) => {
  const ok = window.confirm("POIの修正提案を行いますか？");
  if (!ok) return;
  const proposeMovingPosition =
    window.confirm("POIの位置も修正しますか？");
  lastClickedMarker.closePopup();
  if (!proposeMovingPosition) {
    const text = `POI ID: ${poiId} ${twitInit}`;
    const href = createTwitterIntentUrl({
      text,
      //url: "https://code4history.dev/TatebayashiStones/",
      hashtags: hashTags,
    });
    window.open(href, "_blank", "noreferrer");
  } else {
    oms.unspiderfy();
    hiddenMarkers();
    lastClickedMarkerOriginalPopupContent = lastClickedMarker
      .getPopup()
      .getContent();
    lastClickedMarker.getElement().style.visibility = "visible";
    oms.removeMarker(lastClickedMarker);
    lastClickedMarker.dragging.enable();
    lastClickedMarker.on("dragend", () => {
      const latlng = lastClickedMarker.getLatLng();
      const text =
        `POI ID: ${poiId}\n` + `緯度:${roundDec(latlng.lat,7)}, 経度:${roundDec(latlng.lng,7)} ${twitInit}`;
      const href = createTwitterIntentUrl({
        text,
        //url: "https://code4history.dev/TatebayashiStones/",
        hashtags: hashTags,
      });
      const aTag = `<a href="${href}" target="_blank" rel="noreferrer" onclick="proposeEditedMarker();">Twitterで投稿する</a>`;
      const content = `POI ID: ${poiId}, 緯度:${roundDec(latlng.lat,7)}, 経度:${roundDec(latlng.lng,7)}<br>${aTag}`;
      lastClickedMarker.setPopupContent(content);
    });
    isEditingMarker = true;
  }
};
const proposeEditedMarker = () => {
  lastClickedMarker.closePopup();
  lastClickedMarker.dragging.disable();
  lastClickedMarker.setPopupContent(
    lastClickedMarkerOriginalPopupContent
  );
  lastClickedMarker.setLatLng(lastClickedMarkerOriginalLatlng);
  isEditingMarker = false;
  oms.addMarker(lastClickedMarker);
  visibleMarkers();
};
mymap.on("click", (e) => {
  if (spiderfyStatus) return;
  const ok = window.confirm(
    "POIの新規申請を行いますか？\nOKをクリックすると、マーカーが生成されるので任意の地点にドラッグして動かし、マーカーをクリックしたのち申請してください。"
  );
  if (!ok) return;
  hiddenMarkers();
  const createContent = (latlng) => {
    const text = `緯度:${roundDec(latlng.lat,7)}, 経度:${roundDec(latlng.lng,7)} ${twitInit}`;
    const href = createTwitterIntentUrl({
      text,
      //url: "https://code4history.dev/TatebayashiStones/",
      hashtags: hashTags,
    });
    const aTag = `<a href="${href}" target="_blank" rel="noreferrer" onclick="visibleMarkers();removeNewMarker();">Twitterで投稿する</a>`;
    const content = `緯度:${roundDec(latlng.lat,7)}, 経度:${roundDec(latlng.lng,7)} ${aTag}`;
    return content;
  };
  newMarker = L.marker(e.latlng, {
    draggable: true,
  }).bindPopup(createContent(e.latlng));
  newMarker.on("dragend", () => {
    const newLatlng = newMarker.getLatLng();
    const newContent = createContent(newLatlng);
    newMarker.setPopupContent(newContent);
  });
  newMarker.addTo(mymap);
});