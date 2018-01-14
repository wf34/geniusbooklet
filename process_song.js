const fs = require('fs');
const content_loader = require('./content_loader');
const cheerio = require('cheerio')
const sleep = require('sleep-promise');


module.exports.query_inner_html = function(address, selector) {
  let outputs = [];
  let selectors = [selector];
  return query_inner_htmls(address, selectors, outputs)
    .then(() => Promise.resolve(outputs[0]));
}


function query_inner_htmls(address, selectors, outputs) {
 let this_page = null;
  return content_loader.load_page(address)
    .then(evaluate_all)
    .then(close_page);

  function evaluate_all(page) {
    console.log("got html");
    this_page = page; 
    return selectors.reduce((promise, selector) => {
      return promise.then(() => select_html(selector).then((result) => outputs.push(result)))
    }, Promise.resolve());
  }

  function select_html(selector) {
    return this_page.$eval(selector, (el) => el.innerHTML);
  }

  function close_page(x) {
    return this_page.close()
      .then(() => x);
  }
}


module.exports.build_url_list = function (lyrics_html) {
  const $ = cheerio.load(lyrics_html)
  let links = [];
  $('a').each(function(i, el) {
    let link = $(this).prop('href')
    link = link.startsWith('http') ? link : GENIUS_SITE + link
    links.push(link)
  });
  console.log('link to follow: ', links);
  return Promise.resolve(links);
};


function load_and_query_annotation(link) {
  return module.exports.query_inner_html(link, ANNOTATION_SELECTOR);
}


function store_all_annotations(annotation_links) {
  let annotations = [];
  return annotation_links.reduce((promise, alink) => {
      return promise.then(() => load_and_query_annotation(alink).then((result) => annotations.push(result)))
    }, Promise.resolve())
    .then(() => Promise.resolve(annotations));
}


function make_td(w, innards) {
  return '<td valign="top" style="width:' + w + '%;border-right:none;border-left:none;border-bottom:none;border-top:none">' + innards + '</td>';
}


function get_cover_art_page(img_html) {
  const img_tree = cheerio.load(img_html);
  const cover_art_url = img_tree('img').attr('src');
  const cover_art_html = fs.readFileSync("./cover_page.html", "utf8");
  return cover_art_html.replace("COVERART_URLTEMPLATE", cover_art_url);
}


function form_song_output_html(annotations, selected_htmls, is_cover_art_needed) {
  console.log('do song html', is_cover_art_needed);
  const author = selected_htmls[0];
  const title = selected_htmls[1];
  const lyrics = selected_htmls[2];
  const cover_art = selected_htmls[3];
  const $ = cheerio.load(lyrics);
  $('a').each(function(i, el) {
    let p = $('<div>' + $(this).html() + '</div>');
    p.attr('annotation_id', i)
    $(this).replaceWith(p);
    
  });

  $('body').prepend('<center><h1>' + title + '</h1><h2>' + author + '</h2></center><br>')

  if (is_cover_art_needed) {
    $('body').prepend(get_cover_art_page(cover_art));
  }

  if (annotations.length > 0) {
    const tabled_song = cheerio.load('<table border = 1px></table>')
    $('body').children().each(function(i, elm) {
      if (elm.tagName === 'div' && $.html(elm).indexOf('cover_art_id') == -1) {
        console.log(i, $.html(elm))
        let annotation_id = $(this).attr('annotation_id')
        let annotation_element = cheerio.load(annotations[annotation_id]);

        annotation_element('img').each(function(i, img_el) {
          let p = annotation_element(img_el)
          p.attr("style", "max-height: 300px")
          p.removeAttr("width")
          p.removeAttr("height")
          annotation_element(this).replaceWith(p);
        });
        tabled_song('table').append('<tr>' +
            make_td(50, $.html(elm)) +
            make_td(50, annotation_element.html()) + '</tr>');
      } else {
        if ((['iframe', 'dfp-ad'].map((x) => $.html(elm).indexOf(x))).some(x => x !== -1)) {
          return;
        }
        if ($.html(elm) == '<br>') {
          return;
        }
        tabled_song('table').append('<tr>' +
            make_td(100, $.html(elm)) + '</tr>');
      }
      tabled_song('table').append('<tr style="border-bottom:1px solid black"><td colspan="100%"></td></tr>\n');
    });

    $('body').append('<!-- separator -->')
    $('body').append('<br>')
    $('body').append(tabled_song.html())
  }
  return Promise.resolve($.html());
}


module.exports.page_to_html = function(page_url, is_cover_art_needed) {
  let selectors_to_call = [AUTHOR_NAME_SELECTOR, SONG_NAME_SELECTOR, BODY_LYRICS_SELECTOR];
  if (is_cover_art_needed) {
    selectors_to_call.push(COVER_ART_SELECTOR);
  }

  let valid_htmls = [];
  return query_inner_htmls(page_url, selectors_to_call, valid_htmls)
    .then(() => module.exports.build_url_list(valid_htmls[2]))
    .then((urls) => store_all_annotations(urls))
    .then((annotations) => form_song_output_html(annotations, valid_htmls, is_cover_art_needed))
};


module.exports.is_genius_url = function (url) {
  return url.startsWith(GENIUS_SITE) || url.startsWith(GENIUS_SITE.substr(8));
};


const GENIUS_SITE = "https://genius.com";
const BODY_LYRICS_SELECTOR = "body > routable-page > ng-outlet > song-page > div > div > div.song_body.column_layout > div.column_layout-column_span.column_layout-column_span--primary > div > defer-compile:nth-child(2) > lyrics > div > section > p";
const AUTHOR_NAME_SELECTOR = "body > routable-page > ng-outlet > song-page > div > div > header-with-cover-art > div > div > div.column_layout-column_span.column_layout-column_span--primary > div.header_with_cover_art-primary_info_container > div > h2 > span > a";
const SONG_NAME_SELECTOR = "body > routable-page > ng-outlet > song-page > div > div > header-with-cover-art > div > div > div.column_layout-column_span.column_layout-column_span--primary > div.header_with_cover_art-primary_info_container > div > h1";
const ANNOTATION_SELECTOR = "body > routable-page > ng-outlet > song-page > div > div > div.song_body.column_layout > div.column_layout-column_span.column_layout-column_span--secondary.u-top_margin.column_layout-flex_column > div.column_layout-flex_column-fill_column > annotation-sidebar > div.u-relative.nganimate-fade_slide_from_left > div:nth-child(2) > annotation > standard-rich-content > div";
const COVER_ART_SELECTOR = "body > routable-page > ng-outlet > song-page > div > div > header-with-cover-art > div > div > div.column_layout-column_span.column_layout-column_span--primary > div.header_with_cover_art-cover_art.show_tiny_edit_button_on_hover > div";
