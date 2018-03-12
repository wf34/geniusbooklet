const fs = require('fs');
const content_loader = require('./content_loader');
const cheerio = require('cheerio')
const sleep = require('sleep-promise');
const invariant = require('invariant');



module.exports.query_inner_html = function(address, selector) {
  let outputs = [];
  let selectors = [selector];
  return query_inner_htmls(address, selectors, outputs)
    .then(() => { invariant(outputs[0] != undefined, 'Query should never fail', address);
                  return Promise.resolve(outputs[0]) });
}


class NoContentError extends Error {
  constructor(message, selector) {
    super(message);
    this.selector = selector;
}};


function query_inner_htmls(address, selectors, outputs) {
 let this_page = null;
  return content_loader.load_page(address)
    .then(evaluate_all)
    .then(close_page);

  function evaluate_all(page) {
    console.log("got content");
    this_page = page; 
    return selectors.reduce((promise, selector) => {
      return promise.then(() => select_html(selector).then((result) => outputs.push(result)))
    }, Promise.resolve());
  }

  function select_html(selector) {
    return this_page.$eval(selector, (el) => el.innerHTML)
      .catch((error) => Promise.reject(new NoContentError(error, selector)))
      .catch(restart)
  }

  function close_page(x) {
    return this_page.close()
      .then(() => x);
  }

  function restart(error) {
    if (error instanceof NoContentError) {
      return sleep(1000)
        .then(() => Promise.resolve(error.selector))
        .then(select_html);
    } else {
      throw error;
    }
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


function reformat_youtube_embeds(html) {
  const $ = cheerio.load(html);
  $('.embedly_preview--video').each(function(i, el) {
    let e = $(el);
    let iframe = e.find('iframe');
    src = iframe.attr('src');
    video_code = src.substring(src.lastIndexOf('/') + 1, src.indexOf('?'));
    thumbnail_url = 'https://img.youtube.com/vi/' + video_code + '/default.jpg'
    video_url = 'https://youtube.com/watch?v=' + video_code
    p = $('<a href=' + video_url + '><img src=' + thumbnail_url + '></a>');
    $(this).replaceWith(p);
  });

  $('.embedly_preview').each(function(i, el) {
    $(this).remove();
  });

  return Promise.resolve($.html());
}


function load_and_query_annotation(link) {
  return module.exports.query_inner_html(link, ANNOTATION_SELECTOR)
    .then(reformat_youtube_embeds);
}


function store_all_annotations(annotation_links) {
  let annotations = [];
  return annotation_links.reduce((promise, alink) => {
      return promise.then(() => load_and_query_annotation(alink).then((result) => annotations.push(result)))
    }, Promise.resolve())
    .then(() => Promise.resolve(annotations));
}


function make_block(lyrics_html, annotation_html) {
  const lt = "LYRICS_BLOCK_TEMPLATE";
  const lot = "LYRICS_ONLY_BLOCK_TEMPLATE";
  const at = "ANNOTATION_BLOCK_TEMPLATE";
  let block_html = fs.readFileSync("./annotation_block.html", "utf8");
  let divs_to_remove = [];
  if (annotation_html != undefined) {
    block_html = block_html.replace(lt, lyrics_html);
    block_html = block_html.replace(at, annotation_html);
    divs_to_remove.push('.lyrics_only_block');
  } else {
    block_html = block_html.replace(lot, lyrics_html);
    divs_to_remove.push('.lyrics_block');
    divs_to_remove.push('.annotation_block');
  }
  const block = cheerio.load(block_html);
  divs_to_remove.forEach((x) => { block(x).remove(); });
  return block.html();
}


function get_cover_art_page(cover_art_url) {
  const cover_art_html = fs.readFileSync("./cover_page.html", "utf8");
  return cover_art_html.replace("COVERART_URLTEMPLATE", cover_art_url);
}


function inject_annotation_ids($) {
  $('a').each(function(i, el) {
    let p = $('<div>' + $(this).html() + '</div>');
    p.attr('annotation_id', i)
    $(this).replaceWith(p);
  });
}

function add_header($, title, author, cover_art_address) {
  $('body').prepend('<center><h1>' + title + '</h1><h2>' + author + '</h2></center><br>')
  if (cover_art_address !== undefined) {
    $('body').prepend(get_cover_art_page(cover_art_address));
  }
}

function delete_irrelevant_blocks($) {
  $('body').contents().each(function(i, elm) {
    if ((['<style>', 'h1', 'h2', 'iframe', 'dfp-ad'].map((x) => $.html(elm).indexOf(x))).some(x => x !== -1) ||
        /^\s*$/.test($.html(elm)) ||
        $.html(elm).length < 3) {
      $(this).remove();
    }
  });
}

function annotate($, annotations) {
  if (annotations.length == 0) {
    return;
  }
  let annotations_hash = {};
  let tabled_song = '';
  $('body').contents().each(function(i, elm) {
    if (elm.tagName === 'div') {
      if ($.html(elm).indexOf('cover_art_id') != -1) {
        return;
      }
      let annotation_id = $(this).attr('annotation_id')
      invariant(annotations[annotation_id] !== undefined,
                'We must have the annotation',
                annotation_id, annotations.length);
      let annotation_element = cheerio.load(annotations[annotation_id], {decodeEntities: false});

      annotation_element('img').each(function(i, img_el) {
        let p = annotation_element(img_el);
        p.attr("style", "display: block; width: 70%; height: auto;");
        p.removeAttr("width");
        p.removeAttr("height");
        annotation_element(this).replaceWith(p);
      });
      if (annotation_element.html() in annotations_hash) {
        tabled_song += make_block($.html(elm));
      } else {
        tabled_song += make_block($.html(elm), annotation_element.html());
        annotations_hash[annotation_element.html()] = true;
      }
    } else {
      if ($.html(elm) != '<br>' &&
          (['<h1>', '<h2>'].map((x) => $.html(elm).indexOf(x))).every(x => x === -1)) {
        tabled_song += make_block($.html(elm));
      }
    }
  });
  $('body').append('<!-- separator -->')
  $('body').append('<br>')
  $('body').append(tabled_song)
}

function form_song_output_html(annotations, selected_htmls, cover_art_address) {
  console.log('do song html', cover_art_address);
  const author = selected_htmls[0];
  const title = selected_htmls[1];
  const lyrics = selected_htmls[2];
  invariant(lyrics !== undefined, 'Lyrics must exist');
  const $ = cheerio.load(lyrics, {decodeEntities: false});
  inject_annotation_ids($);
  delete_irrelevant_blocks($);
  add_header($, title, author, cover_art_address);
  annotate($, annotations);
  return Promise.resolve($.html());
}


module.exports.page_to_html = function(page_url, cover_art_address) {
  let selectors_to_call = [AUTHOR_NAME_SELECTOR, SONG_NAME_SELECTOR, BODY_LYRICS_SELECTOR];

  let valid_htmls = [];
  return query_inner_htmls(page_url, selectors_to_call, valid_htmls)
    .then(() => module.exports.build_url_list(valid_htmls[2]))
    .then((urls) => store_all_annotations(urls))
    .then((annotations) => form_song_output_html(annotations, valid_htmls, cover_art_address))
};


module.exports.is_genius_url = function (url) {
  return url.startsWith(GENIUS_SITE) || url.startsWith(GENIUS_SITE.substr(8));
};


const GENIUS_SITE = "https://genius.com";
const BODY_LYRICS_SELECTOR = "body > routable-page > ng-outlet > song-page > div > div > div.song_body.column_layout > div.column_layout-column_span.column_layout-column_span--primary > div > defer-compile:nth-child(2) > lyrics > div > section > p";
const AUTHOR_NAME_SELECTOR = "body > routable-page > ng-outlet > song-page > div > div > header-with-cover-art > div > div > div.column_layout-column_span.column_layout-column_span--primary > div.header_with_cover_art-primary_info_container > div > h2 > span > a";
const SONG_NAME_SELECTOR = "body > routable-page > ng-outlet > song-page > div > div > header-with-cover-art > div > div > div.column_layout-column_span.column_layout-column_span--primary > div.header_with_cover_art-primary_info_container > div > h1";
const ANNOTATION_SELECTOR = "body > routable-page > ng-outlet > song-page > div > div > div.song_body.column_layout > div.column_layout-column_span.column_layout-column_span--secondary.u-top_margin.column_layout-flex_column > div.column_layout-flex_column-fill_column > annotation-sidebar > div.u-relative.nganimate-fade_slide_from_left > div:nth-child(2) > annotation > standard-rich-content > div";
