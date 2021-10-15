let popupHtmlTemplate = "";

popupHtmlTemplate += `<div class="poi">`;

popupHtmlTemplate += `<h2>{{name}} (`;
popupHtmlTemplate += `{{area}}`;
popupHtmlTemplate += "{{#if place_1}} / {{place_1}} {{/if}}";
popupHtmlTemplate += "{{#if place_2}} / {{place_2}} {{/if}}";
popupHtmlTemplate += "{{#if detail}} / {{detail}} {{/if}}";
popupHtmlTemplate += `)</h2>`;

popupHtmlTemplate += `{{#if type}} <b>種別:</b> {{ type }} <br> {{/if}}`;

popupHtmlTemplate += `<a href="{{{ path }}}" target="_blank">
            <img class="represent" src="{{{ mid_thumbnail }}}">
          </a><br>`;

popupHtmlTemplate += `<b>年代:</b> {{ era }} {{#if year}} ({{ year }}) {{/if}}<br>`;

popupHtmlTemplate += `{{#if shape}}         <b>形状:</b> {{ shape }}<br> {{/if}}`;
popupHtmlTemplate += `{{#if note_1}}        <b>付帯情報:</b> {{ breaklines note_1 }}<br> {{/if}}`;
popupHtmlTemplate += `{{#if note_2}}        <b>伝承等:</b> {{ breaklines note_2 }}<br> {{/if}}`;
popupHtmlTemplate += `{{#if note_3}}        <b>調査時メモ:</b> {{ breaklines note_3 }}<br> {{/if}}`;
popupHtmlTemplate += `{{#if material}}      <b>材質:</b> {{ material }}<br> {{/if}}`;
popupHtmlTemplate += `{{#if height}}        <b>総高:</b> {{ height }}cm<br> {{/if}}`;
popupHtmlTemplate += `{{#if statue_height}} <b>像高:</b> {{ statue_height }}cm<br> {{/if}}`;
popupHtmlTemplate += `{{#if width}}         <b>幅:</b> {{ width }}cm<br> {{/if}}`;
popupHtmlTemplate += `{{#if depth}}         <b>奥行:</b> {{ depth }}cm<br> {{/if}}`;
popupHtmlTemplate += `{{#if inscription}}   <b>刻銘:</b> {{ breaklines inscription }}<br> {{/if}}`;

popupHtmlTemplate += `<b>最終現地調査日:</b> {{#if confirmed }} {{ surveyed }} {{else}} 未調査 {{/if}}<br>`;

popupHtmlTemplate += `<b>現況:</b>
  {{#if (eq status '消失')}} 喪失
  {{else if (eq status '消失?')}} 喪失疑い
  {{else if (eq status '新規発見')}} 新規追加(資料にない)
  {{else if confirmed }} 現存
  {{else}} 不明(未調査) {{/if}}<br>`;

popupHtmlTemplate += `{{#if need_action }}   <b>アクション要:</b> {{need_action}} <br> {{/if}}`;
popupHtmlTemplate += `{{#if contradiction }} <b>資料の矛盾:</b> {{contradiction}} <br> {{/if}}`;
popupHtmlTemplate += `{{#if status }}        <b>状況:</b> {{status}} <br> {{/if}}`;

popupHtmlTemplate += `<b>言及資料:</b><br>`;
popupHtmlTemplate += `<ul class="parent">
  {{#each books}}
    <li><b>{{this.name}}</b>({{this.editor}}, {{this.publishedAt}}): {{this.pages}}ページ</li>
  {{/each}}
</ul>`;

popupHtmlTemplate += `{{#if (gt images.length 1)}}
  <b>その他の画像:</b><br>
  <div class="swiper swiper-images">
    <div class="swiper-wrapper">
      {{#each images}}
        {{#if (ne image.path path)}}
          <div class="swiper-slide">
            {{#if this.panorama_image}}
              <img src="{{{this.path}}}" onclick="openPanorama('{{{this.path}}}');" class="panorama">
            {{else}}
              <a href="{{{this.path}}}" target="_blank">
                <img src="{{{this.small_thumbnail}}}">
              </a>
            {{/if}};
          </div>
        {{/if}}
      {{/each}}
      </div>
      <div class="swiper-button-next"></div>
      <div class="swiper-button-prev"></div>
      <div class="swiper-pagination"></div>
    </div>
{{/if}}`;

popupHtmlTemplate += `<a href="javascript:void(0)" onclick="prepareEditMarker({{{fid}}});">修正提案をする</a>`;
popupHtmlTemplate += `<br>`;
popupHtmlTemplate += `<a href="javascript:void(0)" onclick="proposeEditedMarker({{{fid}}});">Twitterで投稿する</a>`;
popupHtmlTemplate += `</div>`;
