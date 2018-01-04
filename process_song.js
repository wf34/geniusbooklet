const content_loader = require('./content_loader');
const cheerio = require('cheerio')
const fs = require('fs');
const sleep = require('sleep-promise');


function query_inner_html(address, selector) {
 let this_page = null;
  return content_loader.load_page(address)
    .then(select_html)
    .then(close_page);

  function select_html(page) {
    console.log("got html");
    this_page = page; 
    return page.$eval(selector, (el) => el.innerHTML);
  }
  function close_page(x) {
    return this_page.close()
      .then(() => x);
  }
}


function build_annotation_urls_list(lyrics_html) {
  const $ = cheerio.load(lyrics_html)
  let links = [];
  $('a').each(function(i, el) {
    let link = $(this).prop('href')
    link = link.startsWith('http') ? link : GENIUS_SITE + link
    links.push(link)
  });
  console.log('link to follow: ', links);
  return Promise.resolve(links);
}


function load_and_query_annotation(link) {
  return query_inner_html(link, ANNOTATION_SELECTOR);
}

function store_all_annotations(annotation_links, annotations) {
  console.log(annotation_links);
  return annotation_links.reduce((promise, alink) => {
      return promise.then(() => load_and_query_annotation(alink).then((result) => annotations.push(result)))
    }, Promise.resolve());
}

function make_td(w, innards) {
  return '<td valign="top" style="width:' + w + '%;border-right:none;border-left:none;border-bottom:none;border-top:none">' + innards + '</td>';
}

function form_song_output_html(lyrics, annotations) {
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
  return Promise.resolve($.html());
}


function render(output_html, dst_filepath) {
  console.log('will store to ' + dst_filepath);
  fs.writeFileSync(dst_filepath.slice(0, -4) + '.txt', output_html);
  
  let this_page = null;
  return content_loader.load_page('about:blank')
    .then(set_content)
    .then(sleep.bind(null, 30000))
    .then(render_pdf)
    .then(close_page);

  function set_content(page) {
    this_page = page;
    //TODO(wf34) fix when resolved https://github.com/GoogleChrome/puppeteer/issues/1278
    // return page.waitForNavigation({waitUntil: 'networkidle2' })
    // .then(page.pdf.bind(null, {path: destination, format: 'A4'}));
    return page.setContent(output_html)
  }

  function render_pdf() {
    return this_page.pdf({path: dst_filepath,
                          format: 'A4',
                          landscape : true });
  }

  function close_page() {
    return this_page.close();
  }
}


function page_to_pdf(page_url, page_dst_path) {
  let annotations = [];

  return query_inner_html(page_url, BODY_LYRICS_SELECTOR)
    .then(build_annotation_urls_list)
    .then((urls) => store_all_annotations(urls, annotations))
    .then(query_inner_html.bind(null, page_url, BODY_LYRICS_SELECTOR))
    .then((html) => form_song_output_html(html, annotations))
    .then((out_html) => render(out_html, page_dst_path))
    .then(content_loader.shutdown);
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

page_to_pdf(address, destination);
