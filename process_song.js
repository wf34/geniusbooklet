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
  invariant(lyrics !== undefined, 'Lyrics must exist');
  const $ = cheerio.load(lyrics);
  
  $('a').each(function(i, el) {
    let p = $('<div>' + $(this).html() + '</div>');
    p.attr('annotation_id', i)
    $(this).replaceWith(p);
    
  });

  $('body').prepend('<center><h1>' + title + '</h1><h2>' + author + '</h2></center><br>')

  if (is_cover_art_needed) {
    invariant(cover_art !== undefined, 'Cover Art Url must exist');
    $('body').prepend(get_cover_art_page(cover_art));
  }

  if (annotations.length > 0) {
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
        let annotation_element = cheerio.load(annotations[annotation_id]);

        annotation_element('img').each(function(i, img_el) {
          let p = annotation_element(img_el);
          p.attr("style", "display: block; width: 70%; height: auto;");
          p.removeAttr("width");
          p.removeAttr("height");
          annotation_element(this).replaceWith(p);
        });
        tabled_song += make_block($.html(elm), annotation_element.html());
      } else {
        if ((['<style>', 'h1', 'h2', 'iframe', 'dfp-ad'].map((x) => $.html(elm).indexOf(x))).some(x => x !== -1)) {
          return;
        }
        if ($.html(elm) == '<br>') {
          return;
        }
        tabled_song += make_block($.html(elm));
      }
    });
    $('body').append('<!-- separator -->')
    $('body').append('<br>')
    $('body').append(tabled_song)
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
