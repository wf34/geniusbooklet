const puppeteer = require('puppeteer');
const sleep = require('sleep-promise');

global_browser_handle = null;

function get_browser() {
  if (global_browser_handle == null) {
    return puppeteer.launch();
  } else {
    return Promise.resolve(global_browser_handle);
  }
}

function instantiate_page(browser) {
  console.log("browser started")
  if (global_browser_handle == null) {
    global_browser_handle = browser;
  }
  return browser.newPage();
}


function navigate_page(address, page) {
  console.log('now navigate to: ', address)
  return page.goto(address, {
                   waitUntil: 'networkidle2',
                   timeout: 240000
                 })
       .then(() => Promise.resolve(page));
}

function fetch_page_content(page) {
  console.log("Yay, page loaded");
  return page.content()
    .then(() => Promise.resolve(page));
}


module.exports.load_page = function(url) {
  return sleep(7000)
    .then(get_browser)
    .then(instantiate_page)
    .then(navigate_page.bind(null, url))
    .then(fetch_page_content)
};

module.exports.shutdown = function() {
  return global_browser_handle.close();
};
