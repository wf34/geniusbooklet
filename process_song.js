const content_loader = require('./content_loader');
const cheerio = require('cheerio')
const fs = require('fs');
const sleep = require('sleep-promise');


function handle_error(error_message) {
  console.log('my error: ', error_message);
  global_browser_handle.close();
  throw new Error(error_message);
}

function query_inner_html(address, selector) {
  return content_loader.load_page(address).then((content) => {
    console.log("got html");
    return global_page_handle.$eval(selector, (el) => el.innerHTML)
  });
}


function build_annotations_list(lyrics_html) {
  const $ = cheerio.load(lyrics_html)
  let links = [];
  $('a').each(function(i, el) {
    let link = $(this).prop('href')
    link = link.startsWith('http') ? link : GENIUS_SITE + link
    links.push(link)
  });
  // links = links.slice(0, 2); // TODO(wf34) remove list prune
  console.log('link to follow: ', links);
  return global_page_handle.close().then(() => Promise.resolve(links));
}


function load_and_query_annotation(link) {
  var annotation_html = "";
  return query_inner_html(link, ANNOTATION_SELECTOR)
    .then((x) => {
      annotation_html = x;
      global_page_handle.close(); 
    })
    .then(() => Promise.resolve(annotation_html));
}

function store_all_annotations(annotation_links) {
  return annotation_links.reduce((promise, alink) => {
      return promise.then(() => load_and_query_annotation(alink).then((result) => annotations.push(result)))
    }, Promise.resolve());
}

function make_td(w, innards) {
  return '<td valign="top" style="width:' + w + '%;border-right:none;border-left:none;border-bottom:none;border-top:none">' + innards + '</td>';
}

function parse_lyrics(lyrics) {
  const $ = cheerio.load(lyrics)
  $('a').each(function(i, el) {
    let p = $('<div>' + $(this).html() + '</div>');
    p.attr('annotation_id', i)
    $(this).replaceWith(p);
    
  });
  if (annotations.length > 0) {
    const tabled_song = cheerio.load('<table border = 1px></table>')
    $('body').children().each(function(i, elm) {
      if (elm.tagName === 'div') {
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
      } else if (-1 !== $.html(elm).indexOf('dfp-ad')) {
        return;
      } else {
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
  fs.writeFileSync(destination.slice(0, -4) + '.txt', $.html());
  return global_page_handle.setContent($.html()).then(sleep(10000));
}


function render() {
  //TODO(wf34) fix when resolved https://github.com/GoogleChrome/puppeteer/issues/1278
  // return global_page_handle.waitForNavigation({waitUntil: 'networkidle2' })
  // .then(global_page_handle.pdf.bind(null, {path: destination, format: 'A4'}));
  return global_page_handle.pdf({path: destination,
                                 format: 'A4',
                                 landscape : true });
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
const BODY_LYRICS_SELECTOR = "body > routable-page > ng-outlet > song-page > div > div > div.song_body.column_layout > div.column_layout-column_span.column_layout-column_span--primary > div > defer-compile:nth-child(2) > lyrics > div > section > p";
const ANNOTATION_SELECTOR = "body > routable-page > ng-outlet > song-page > div > div > div.song_body.column_layout > div.column_layout-column_span.column_layout-column_span--secondary.u-top_margin.column_layout-flex_column > div.column_layout-flex_column-fill_column > annotation-sidebar > div.u-relative.nganimate-fade_slide_from_left > div:nth-child(2) > annotation > standard-rich-content > div";
const annotations = [];

query_inner_html(address, BODY_LYRICS_SELECTOR)
  .then(build_annotations_list, handle_error)
  .then(store_all_annotations, handle_error)
  .then(query_inner_html.bind(null, address, BODY_LYRICS_SELECTOR))
  .then(parse_lyrics, handle_error)
  .then(render, handle_error)
  .then(shutdown)
