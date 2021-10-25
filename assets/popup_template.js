let popupHtmlTemplate = "";

popupHtmlTemplate += `<div class="poi">`;

popupHtmlTemplate += `<h2>{{ name }} (`;
popupHtmlTemplate += `{{ area }}`;
popupHtmlTemplate += "{% if place_1 %} / {{ place_1 }} {% endif %}";
popupHtmlTemplate += "{% if place_2 %} / {{ place_2 }} {% endif %}";
popupHtmlTemplate += "{% if detail %} / {{ detail }} {% endif %}";
popupHtmlTemplate += `)</h2>`;

popupHtmlTemplate += `{% if type %} <b>種別:</b> {{ type }} <br> {% endif %}`;

popupHtmlTemplate += `{% if images.length > 0 %}
  <div class="swiper swiper-images">
    <div class="swiper-wrapper">
      {%- for image in images %}
          <div class="swiper-slide">
            {%- if image.panorama_image %}
              <img src="{{ image.path | safe }}" onclick="ChuQuyuan.openPanorama('{{ image.path | safe }}');" class="panorama">
            {% else %}
              <a href="{{ image.path | safe }}" target="_blank">
                <img src="{{ image.small_thumbnail | safe }}">
              </a>
            {% endif %}
          </div>
      {% endfor %}
      </div>
      <div class="swiper-button-next"></div>
      <div class="swiper-button-prev"></div>
      <div class="swiper-pagination"></div>
    </div>
{% endif %}`;

popupHtmlTemplate += `<b>年代:</b> {{ era }} {% if year %} ({{ year }}) {% endif %}<br>`;

popupHtmlTemplate += `{% if shape %}         <b>形状:</b> {{ shape }}<br> {% endif %}`;
popupHtmlTemplate += `{% if note_1 %}        <b>付帯情報:</b> {{ note_1 | nl2br }}<br> {% endif %}`;
popupHtmlTemplate += `{% if note_2 %}        <b>伝承等:</b> {{ note_2 | nl2br }}<br> {% endif %}`;
popupHtmlTemplate += `{% if note_3 %}        <b>調査時メモ:</b> {{ note_3 | nl2br }}<br> {% endif %}`;
popupHtmlTemplate += `{% if material %}      <b>材質:</b> {{ material }}<br> {% endif %}`;
popupHtmlTemplate += `{% if height %}        <b>総高:</b> {{ height }}cm<br> {% endif %}`;
popupHtmlTemplate += `{% if statue_height %} <b>像高:</b> {{ statue_height }}cm<br> {% endif %}`;
popupHtmlTemplate += `{% if width %}         <b>幅:</b> {{ width }}cm<br> {% endif %}`;
popupHtmlTemplate += `{% if depth %}         <b>奥行:</b> {{ depth }}cm<br> {% endif %}`;
popupHtmlTemplate += `{% if inscription %}   <b>刻銘:</b> {{ inscription | nl2br }}<br> {% endif %}`;

popupHtmlTemplate += `<b>最終現地調査日:</b> {%if confirmed %} {{ surveyed }} {% else %} 未調査 {% endif %}<br>`;

popupHtmlTemplate += `<b>現況:</b>
  {% if status == "消失" %} 喪失
  {% elif status == "消失?" %} 喪失疑い
  {% elif status == "新規発見" %} 新規追加(資料にない)
  {% elif confirmed %} 現存
  {% else %} 不明(未調査) {% endif %}<br>`;

popupHtmlTemplate += `{% if need_action %}   <b>アクション要:</b> {{ need_action }} <br> {% endif %}`;
popupHtmlTemplate += `{% if contradiction %} <b>資料の矛盾:</b> {{ contradiction }} <br> {% endif %}`;
popupHtmlTemplate += `{% if status %}        <b>状況:</b> {{ status }} <br> {% endif %}`;

popupHtmlTemplate += `<b>言及資料:</b><br>`;
popupHtmlTemplate += `<ul class="parent">
  {% for book in books %}
    <li><b>{{ book.name }}</b>({{ book.editor }}, {{ book.publishedAt }}): {{ book.pages }}ページ</li>
  {% endfor %}
</ul>`;

popupHtmlTemplate += `<a href="javascript:void(0)" onclick="prepareEditMarker({{ fid }});">修正提案をする</a>`;
popupHtmlTemplate += `</div>`;
