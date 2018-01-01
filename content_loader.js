const puppeteer = require('puppeteer');
const sleep = require('sleep-promise');

global_browser_handle = null
global_page_handle = null


function get_browser() {
  if (global_browser_handle == null) {
    return puppeteer.launch({headless: false});
  } else {
    return Promise.resolve(global_browser_handle);
  }
}

function instantiate_page(browser) {
  console.log("browser started")
  if (global_browser_handle == null) {
    global_browser_handle = browser;
  }
  // if (global_page_handle == null) {
  return browser.newPage();
  // } else {
  //   return Promise.resolve(global_page_handle);
  // }
}


function navigate_page(address, page) {
  console.log('now navigate to: ', address)
  // if (global_page_handle == null) {
    global_page_handle = page;
  // }
  return global_page_handle.goto(address, {
                   waitUntil: 'networkidle2',
                   timeout: 180000
                 });
}

function fetch_page_content(_) {
  console.log("Yay, page loaded");
  return global_page_handle.content();
}


module.exports.load_page = function(url) {
  return sleep(7000)
    .then(get_browser)
    .then(instantiate_page)
    .then(navigate_page.bind(null, url))
    .then(fetch_page_content)
};
