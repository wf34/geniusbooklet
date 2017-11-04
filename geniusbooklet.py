#!/usr/bin/env python3

import sys
import lxml.html as html
import lxml.etree as etree
import requests
import requests.compat

url__ = ''

def get_song_root(response):
    global url__
    url__ = response.url
    root = html.fromstring(response.text)
    l = root.find_class('lyrics')[0]
    p_tags = list(filter(lambda x : x.tag == 'p', l))
    assert len(p_tags) == 1
    p_tag = p_tags[0]
    return p_tag


def stringify_children(node):
    from itertools import chain
    parts = ([node.text] +
            list(chain(*([c.text, etree.tounicode(c), c.tail] for c in node.getchildren()))) +
            [node.tail])
    
    # filter removes possible Nones in texts and tails
    return parts#''.join(filter(None, parts))


def parse_commentary(link):
    target_url = requests.compat.urljoin(url__, link)
    print(target_url, '\n\n')
    r = session.get(target_url)
    root = html.fromstring(r.text)
        #//div[@class='rich_text_formatting']/span/@hahahaha
    #src = root.xpath("//div[@empty-copy-content='referent.fragment_from_lyrics']/*//standard-rich-content/div[@class='rich_text_formatting']")
    xpath_req = '//div[@class="annotation_sidebar_unit"]'
    token = "standard-rich-content" 
    print(r.text)
    exit(1)
    i = r.text.find(token)
    print('plain-text-seach:', i, 'for ', token)
    src = root.xpath(xpath_req)
    print('src', src)
    print('src', etree.tounicode(src[0]))
    exit(1)
 

def get_song_structure(root):
    #print(etree.tounicode(root))
    #print(stringify_children(root))
    print('T', root.text)
    a = list(map(lambda x: x.tag == 'a', root.getchildren()))
    b = list(map(lambda x: x.tag, root.getchildren()))
    for c in root.getchildren():
        if c.tag == 'br':
            print('===sep===')
            print(c.text)
            print(c.tail)
        elif c.tag == 'a':
            print('link', c.attrib['href'])
            commentary = parse_commentary(c.attrib['href'])
            print(c.text)
            print(c.tail)
        
    print('t', root.tail)


def main():
    aes = 'https://genius.com/Aesop-rock-none-shall-pass-lyrics'
    john = 'https://genius.com/Johnyboy-the-demons-lyrics'
    eag = 'https://genius.com/Eagles-hotel-california-lyrics'
    r = requests.get(aes)
    sroot = get_song_root(r)
    print(get_song_structure(sroot))
    


if '__main__' == __name__:
    if sys.version_info[0] < 3:
        assert False, 'tested with Python3 only'
    else:
        main()

