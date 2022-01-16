let iconTemplate = "";

iconTemplate = `
{%- set iconUrl = "sekihi" -%}
{%- set width = 32 -%}
{%- set height = 44 -%}

{%- if type.match("地蔵菩薩像") -%}
  {%- set iconUrl = "jizo" -%}
  {%- set width = 23 -%}
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

{%- if status and status.match("消失") -%}
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