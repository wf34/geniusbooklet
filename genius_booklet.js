const puppeteer = require('puppeteer');

const args = process.argv;
address = args[2]
var message = "Hello world";
console.log(message + address);

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

function parse_root_html(content) {
  console.log("got html");
  require('fs').writeFileSync('/tmp/aes.html', content)
}

let follow_root_url = function (page) { return navigate_page(page, address); }

let browser_promise = puppeteer.launch({headless: false})
  .then(instantiate_page, handle_error)
  .then(follow_root_url, handle_error)
  .then(fetch_page_content, handle_error)
  .then(parse_root_html, handle_error)
console.log("got browser", browser_promise);
