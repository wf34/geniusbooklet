const fs = require('fs');
const minimist = require('minimist');
const sleep = require('sleep-promise');
const content_loader = require('./content_loader');
const process_song = require('./process_song');


const ALBUM_LIST_SELECTOR = 'body > routable-page > ng-outlet > album-page > div.column_layout.u-top_margin > div.column_layout-column_span.column_layout-column_span--primary > div';


function add_schema_if_needed(url) {
  return url.startsWith('http') ? url : 'https://' + url;
}


function make_destination(positional_args) {
  if (positional_args.length == 2) {
    if (!(positional_args[1].endsWith('.pdf'))) {
      throw 'Error: expected destination to be a pdf file; got -> ' + positional_args[1]
    }
    return positional_args[1];
  } else {
    let parts = positional_args[0].split('/');
    return './' + parts[parts.length - 1] + '.pdf'
  }
}


function parse_track_list(url) {
  return process_song.query_inner_html(url, ALBUM_LIST_SELECTOR)
    .then(process_song.build_url_list,
          () => Promise.resolve([]));
}


make_html_page_break = function() {
  return '<body><div style="page-break-after: always;"><br></div></body>';
}


function build_html_booklet(track_list) {
  console.log('Run in album mode');
  let track_list_with_flags = track_list.map(function(e, i) {
    return [e, i == 0 ? true : false];
  });
  let full_html = "";
  let page_break = make_html_page_break();
  return track_list_with_flags.reduce((promise, args) => {
    return promise.then(() => process_song.page_to_html.apply(this, args)
                              .then((result) => { if (full_html !== "") {
                                                    full_html += page_break;
                                                  }
                                                  full_html += result;
                                                })
                       );
  }, Promise.resolve())
  .then(() => Promise.resolve(full_html));
}


function add_last_page(html) {
  let last_page_html = fs.readFileSync("./last_page.html", "utf8");
  let today = new Date().toISOString().slice(0, 10);
  last_page_html = last_page_html.replace("CURRENTDATE", today);
  html += last_page_html;
  return Promise.resolve(html);
}


function make_booklet(args) {
  let url = args['_'][0];
  let destination = make_destination(args['_']);
  let print_format = args['format'] != undefined ? args['format'] : 'p';
  console.log('Booklet will be stored at: ', destination);

  if (!(process_song.is_genius_url(url))) {
    throw 'Error: expected url from genius.com';
  }
  url = add_schema_if_needed(url);
  return parse_track_list(url)
    .then(execute_proper_mode)
    .then(add_last_page)
    .then((out_html) => render(out_html, destination, print_format))
    .then(content_loader.shutdown);

  function execute_proper_mode(parsed_tracklist) {
    if (parsed_tracklist.length > 0) {
      return build_html_booklet(parsed_tracklist);
    } else {
      console.log('Run in single song mode');
      return process_song.page_to_html(url, true)
        .then((html) => Promise.resolve(
          html + make_html_page_break()));
    }
  }
}


function render(output_html, dst_filepath, print_format) {
  fs.writeFileSync(dst_filepath.slice(0, -4) + '.html', output_html);
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

  function get_render_options() {
    let opts = {path: dst_filepath,
                printBackground : true};

    if (print_format == 'p') {
      opts.format = 'A4';
      opts.landscape = false;
    } else {
      opts.width = '105mm';
      opts.height = '148mm';
      opts.landscape = true;
    }
    return opts;
  }

  function render_pdf() {
    return this_page.pdf(get_render_options());
  }

  function close_page() {
    return this_page.close();
  }
}

function main() {
  let arguments_ = minimist(process.argv.slice(2));
  let is_format_valid = function(args) {
    const fargs = args['format'];
    return fargs === undefined ||
           (fargs.length > 0 && (fargs[0] == 'p' || fargs[0] == 'b')) ||
           fargs.length === 0;
  };

  if (arguments_.hasOwnProperty('help') ||
      arguments_.hasOwnProperty('?') ||
      arguments_['_'].length === 0  ||
      arguments_['_'].length > 2 ||
      !is_format_valid(arguments_)) {
    help_message =
      `Usage: geniusbooklet.js <address> [<destination> options]
        address - url of a song or album from Genius.com
        destination - where to put booklet pdf file
  
       Options:
        --format (default p):
          * p (page) print in A4, better suited for off-the-screen reading 
          * b (booklet) print in 4.75in x 4.75in for nice typographic
      `;
    console.log(help_message);
  } else {
    make_booklet(arguments_)
  }
}

main();
