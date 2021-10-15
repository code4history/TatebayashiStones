const panoramaContainerEl = document.getElementById("panorama-container");
const viewerEl = document.getElementById("viewer");
const closeButtonEl = panoramaContainerEl.querySelector(".close");

const viewer = new PANOLENS.Viewer({ container: viewerEl });
let panorama = null;

const openPanorama = (imgUrl) => {
  panorama = new PANOLENS.ImagePanorama(imgUrl);
  viewer.add(panorama);
  panoramaContainerEl.classList.add("open");
};

const disposePanorama = () => {
  panorama.dispose();
  viewer.remove(panorama);
  panorama = null;
};

closeButtonEl.addEventListener(
  "click",
  () => {
    disposePanorama();
    panoramaContainerEl.classList.remove("open");
  },
  false
);
