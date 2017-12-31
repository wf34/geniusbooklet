const puppeteer = require('puppeteer');

const args = process.argv;
if (args.length < 4) {
  console.log('Required args: <song_url> <destination_path>')
  return 1
}
address = args[2]
destination = args[3]


function handle_error(error_message) {
  console.log('my error: ', error_message);
  global_browser_handle.close();
  throw new Error(error_message);
}

function instantiate_page(browser) {
  global_browser_handle = browser
  console.log("We get to create new page")
  return browser.newPage();
}

function navigate_page(page) {
  console.log("page created")
  global_page_handle = page
  return page.goto(address, {
                   waitUntil: 'networkidle2',
                   timeout: 90000
                 });
}

function fetch_page_content(page) {
  console.log("Yay, page loaded")
  return global_page_handle.content();
}


function query_root_html(content) {
  console.log("got html");
  const BODY_LYRICS_SELECTOR = 'body > routable-page > ng-outlet > song-page > div > div > div.song_body.column_layout > div.column_layout-column_span.column_layout-column_span--primary > div > defer-compile:nth-child(2) > lyrics > div > section > p';
  return global_page_handle.$eval(BODY_LYRICS_SELECTOR, (el) => el.innerHTML);
}

function parse_lyrics(lyrics) {
  console.log('got lyrics: ', lyrics);
  return global_page_handle.setContent(lyrics);
}

function render() {
  return global_page_handle.pdf({path: destination, format: 'A4'});
}

function shutdown() {
  global_browser_handle.close();
}

let follow_root_url = function (page) { return navigate_page(page, address); }

let browser_promise = puppeteer.launch({headless: true})
  .then(instantiate_page, handle_error)
  .then(follow_root_url, handle_error)
  .then(fetch_page_content, handle_error)
  .then(query_root_html, handle_error)
  .then(parse_lyrics, handle_error)
  .then(render, handle_error)
  .then(shutdown, handle_error)
