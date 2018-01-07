const minimist = require('minimist');
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
          () => {throw ''})
}


function save_booklet(track_list, destination) {
  console.log('Run in album mode');
  throw 'unimplemented';
}


function make_booklet(args) {
  let url = args['_'][0];
  let destination = make_destination(args['_']);
  console.log('Booklet will be stored at: ', destination);

  if (!(process_song.is_genius_url(url))) {
    throw 'Error: expected url from genius.com';
  }
  url = add_schema_if_needed(url);
  return parse_track_list(url)
  .then((track_list) => save_booklet(track_list, destination),
        () => { console.log('Run in single song mode');
                process_song.page_to_pdf(url, destination);
               });
}


function main() {
  let arguments_ = minimist(process.argv.slice(2));
  if (arguments_.hasOwnProperty('help') ||
      arguments_.hasOwnProperty('?') ||
      arguments_['_'].length === 0  ||
      arguments_['_'].length > 2) {
    help_message =
      `Usage: geniusbooklet.js <address> [<destination> options]
        address - url of a song or album from Genius.com
        destination - where to put booklet pdf file
  
       Options:
        format (default b):
          * p (page) print in A4, better suited for off-the-screen reading 
          * b (booklet) print in 4.75in x 4.75in for nice typographic
      `;
    console.log(help_message);
  } else {
    try {
      make_booklet(arguments_)
        .then(content_loader.shutdown);
    } catch (e) {
      console.log(e)
    }
  }
}

main();
