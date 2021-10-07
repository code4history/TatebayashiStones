let popup = "";

popup += `<div class="poi">`;

popup += `<h2>{{name}} (`;
popup += `{{area}}`;
popup += "{{#if place_1}} / {{place_1}} {{/if}}";
popup += "{{#if place_2}} / {{place_2}} {{/if}}";
popup += "{{#if detail}} / {{detail}} {{/if}}";
popup += `)</h2>`;

popup += `{{#if type}} <b>種別:</b> {{ type }} <br> {{/if}}`;

popup += `<a href="{{{ path }}}" target="_blank">
            <img class="represent" src="{{{ mid_thumbnail }}}">
          </a><br>`;

popup += `<b>年代:</b> {{ era }} {{#if year}} ({{ year }}) {{/if}}<br>`;

popup += `{{#if shape}}         <b>形状:</b> {{ shape }}<br> {{/if}}`;
popup += `{{#if note_1}}        <b>付帯情報:</b> {{ breaklines note_1 }}<br> {{/if}}`;
popup += `{{#if note_2}}        <b>伝承等:</b> {{ breaklines note_2 }}<br> {{/if}}`;
popup += `{{#if note_3}}        <b>調査時メモ:</b> {{ breaklines note_3 }}<br> {{/if}}`;
popup += `{{#if material}}      <b>材質:</b> {{ material }}<br> {{/if}}`;
popup += `{{#if height}}        <b>総高:</b> {{ height }}cm<br> {{/if}}`;
popup += `{{#if statue_height}} <b>像高:</b> {{ statue_height }}cm<br> {{/if}}`;
popup += `{{#if width}}         <b>幅:</b> {{ width }}cm<br> {{/if}}`;
popup += `{{#if depth}}         <b>奥行:</b> {{ depth }}cm<br> {{/if}}`;
popup += `{{#if inscription}}   <b>刻銘:</b> {{ breaklines inscription }}<br> {{/if}}`;

popup += `<b>最終現地調査日:</b> {{#if confirmed }} {{ surveyed }} {{else}} 未調査 {{/if}}<br>`;

popup += `<b>現況:</b>
  {{#if (eq status '消失')}} 喪失
  {{else if (eq status '消失?')}} 喪失疑い
  {{else if (eq status '新規発見')}} 新規追加(資料にない)
  {{else if confirmed }} 現存
  {{else}} 不明(未調査) {{/if}}<br>`;

popup += `{{#if need_action }}   <b>アクション要:</b> {{need_action}} <br> {{/if}}`;
popup += `{{#if contradiction }} <b>資料の矛盾:</b> {{contradiction}} <br> {{/if}}`;
popup += `{{#if status }}        <b>状況:</b> {{status}} <br> {{/if}}`;

popup += `<b>言及資料:</b><br>`;
popup += `<ul class="parent">
  {{#each books}}
    <li><b>{{this.name}}</b>({{this.editor}}, {{this.publishedAt}}): {{this.pages}}ページ</li>
  {{/each}}
</ul>`;

popup += `{{#if (gt images.length 1)}}
  <b>その他の画像:</b><br>
  <div class="parent">
    {{#each images}}
      {{#if (ne image.path path)}}
        <div class="child">
          <div>
            <a href="{{{this.path}}}" target="_blank">
              <img src="{{{this.small_thumbnail}}}">
            </a>
          </div>
        </div>
      {{/if}}
    {{/each}}
  </div>
{{/if}}`;

popup += `</div>`;

const popupTemplate = Handlebars.compile(popup);
