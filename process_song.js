const content_loader = require('./content_loader');
const cheerio = require('cheerio')


function handle_error(error_message) {
  console.log('my error: ', error_message);
  global_browser_handle.close();
  throw new Error(error_message);
}

function query_root_html(content) {
  console.log("got html");
  // console.log("handle ->", global_page_handle);
  // console.log("content ->", content);
  const BODY_LYRICS_SELECTOR = "body > routable-page > ng-outlet > song-page > div > div > div.song_body.column_layout > div.column_layout-column_span.column_layout-column_span--primary > div > defer-compile:nth-child(2) > lyrics > div > section > p";
  return global_page_handle.$eval(BODY_LYRICS_SELECTOR, (el) => el.innerHTML);
}


function build_annotations_list(lyrics_html) {
  const $ = cheerio.load(lyrics_html)
  links = []
  $('a').each(function(i, el) {
    let link = $(this).prop('href')
    link = link.startsWith('http') ? link : GENIUS_SITE + link
    links.push(link)
  });
  console.log(links)
  return global_page_handle.close().then(() => Promise.resolve(links));
}

function query_annotation(content) {
  console.log("got html2");
  const ANNOTATION_SELECTOR = "body > routable-page > ng-outlet > song-page > div > div > div.song_body.column_layout > div.column_layout-column_span.column_layout-column_span--secondary.u-top_margin.column_layout-flex_column > div.column_layout-flex_column-fill_column > annotation-sidebar > div.u-relative.nganimate-fade_slide_from_left > div:nth-child(2) > annotation > standard-rich-content > div";
  return global_page_handle.$eval(ANNOTATION_SELECTOR, (el) => el.innerHTML);
}

function load_and_query_annotation(link) {
  return content_loader.load_page(link).then(query_annotation).then(() => global_page_handle.close());
}

function store_all_annotations(links) {
  return links.reduce((promise, link) => {
      return promise.then(() => load_and_query_annotation(link).then((result) => annotations.push(result)))
    }, Promise.resolve());
}

function parse_lyrics(lyrics) {
  const $ = cheerio.load(lyrics)
  links = []
  $('a').each(function(i, el) {
    links.push($(this).prop('href'))
    let p = $('<div>' + $(this).html() + '</div>');
    p.attr('annotation_id', i)
    $(this).replaceWith(p);
    
  });
  console.log(links)
  let short_song_html = $.html();

  const tabled_song = cheerio.load('<body><table></table></body>')
  $('body').children().each(function(i, elm) {
    if (elm.tagName === 'div') {
      let annotation_id = $(this).attr('annotation_id')
      tabled_song('table').append('<tr><td>' + $.html(elm) + '</td><td>' + links[annotation_id] + '</td></tr>')
    } else {
      tabled_song('table').append('<tr><td>' + $.html(elm) + '</td></tr>')
    }
  });
  return global_page_handle.setContent(short_song_html + '<br>' + tabled_song('body').html());
}


function final_test() {
  console.log('annotations: ', annotations);
}


function render() {
  return global_page_handle.pdf({path: destination, format: 'A4'});
}

function shutdown() {
  global_browser_handle.close();
}

const args = process.argv;
if (args.length < 4) {
  console.log('Required args: <song_url> <destination_path>')
  return 1;
}

address = args[2];
destination = args[3];
const GENIUS_SITE = "https://genius.com";
const annotations = [];

content_loader.load_page(address)
  .then(query_root_html, handle_error)
  .then(build_annotations_list, handle_error)
  .then(store_all_annotations, handle_error)
  .then(final_test)

//content_loader.load_page('https://geektimes.ru')
//  .then(() => content_loader.load_page('https://vk.com'))
//  .then(() => content_loader.load_page('https://gmail.com'))

//  .then(render, handle_error)
//  .then(shutdown, handle_error)
