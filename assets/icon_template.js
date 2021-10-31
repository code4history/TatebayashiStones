let iconTemplate = "";

iconTemplate = `
{%- set iconUrl = "sekihi" -%}
{%- set width = 32 -%}
{%- set height = 44 -%}

{%- if type.match("地蔵菩薩像") -%}
  {%- set iconUrl = "jizo" -%}
{%- elif type.match("その他仏像") or type.match("明王像") or type.match("菩薩像") or type.match("如来像") -%}
  {%- set iconUrl = "hotoke" -%}
  {%- set width = 29 -%}
{%- elif type.match("庚申") -%}
  {%- set iconUrl = "sanzaru" -%}
  {%- set width = 24 -%}
{%- elif type.match("馬頭観世音") -%}
  {%- set iconUrl = "bato" -%}
  {%- set width = 23 -%}
{%- elif type.match("月待塔") or type.match("如意輪観音像") -%}
  {%- set iconUrl = "19ya" -%}
  {%- set width = 32 -%}
{%- endif -%}

{%- if status.match("消失") -%}
  {%- set iconUrl = iconUrl + "_sepia" -%}
  {%- set height = 36 -%}
  {%- set width = (width * 24) / 32 -%}
{%- elif need_action or (not confirmed) or contradiction -%}
  {%- set iconUrl = iconUrl + "_surprise" -%}
  {%- set height = 36 -%}
  {%- set width = (width * 24) / 32 -%}
{%- endif -%}

./assets/{{- iconUrl -}}.png,{{- width | round -}},{{- height -}}
`;


/*
const createIcon = (properties) => {
  let iconUrl = "./assets/sekihi.png";
  let width = 32;
  let height = 44;
  if (properties.type.match("地蔵菩薩像")) {
    iconUrl = "./assets/jizo.png";
    width = 23;
  } else if (
    properties.type.match("その他仏像") ||
    properties.type.match("明王像") ||
    properties.type.match("菩薩像") ||
    properties.type.match("如来像")
  ) {
    iconUrl = "./assets/hotoke.png";
    width = 29;
  } else if (properties.type.match("庚申")) {
    iconUrl = "./assets/sanzaru.png";
    width = 24;
  } else if (properties.type.match("馬頭観世音")) {
    iconUrl = "./assets/bato.png";
    width = 23;
  } else if (
    properties.type.match("月待塔") ||
    properties.type.match("如意輪観音像")
  ) {
    iconUrl = "./assets/19ya.png";
    width = 32;
  }

  if (properties.status.match("消失")) {
    iconUrl = iconUrl.replace(".png", "_sepia.png");
    height = 36;
    width = Math.round((width * 24) / 32);
  } else if (
    properties.need_action ||
    !properties.confirmed ||
    properties.contradiction
  ) {
    iconUrl = iconUrl.replace(".png", "_surprise.png");
    height = 36;
    width = Math.round((width * 24) / 32);
  }

  return {
    iconUrl,
    iconSize: [width, height],
    iconAnchor: [width / 2, height],
    popupAnchor: [0, -1 * height],
  }
}*/
