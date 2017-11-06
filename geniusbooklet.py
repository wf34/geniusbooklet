#!/usr/bin/env python3

import sys
import os
import pickle
import shutil
import subprocess

import lxml.html as html
import lxml.etree as etree

import requests.compat

import song as s
import content_fetch as cf
import tex_conv as tc

tmp_dir_ = '/tmp/geniusbooklet'


def parse_chunk(node):
    link = None if node.tag != 'a' else node.attrib['href']
    parts = [node.text]
    for c in node.getchildren():
        elem = None
        if c.tag == 'a' or c.tag == 'dfp-ad':
            elem = None
        elif c.tag == 'br':
            elem = '\n'
        else:
            assert False, c.tag
        parts.extend([c.text, elem, c.tail])

    if node.tag == 'br':
        parts.append('\n')

    parts.append(node.tail)
    parts = list(filter(None, parts))
    return ''.join(parts), link


def parse_commentary(url):
    output = cf.get_page(url)
    with open('/tmp/com1.txt', 'w') as tf:
        tf.write(output)
    root = html.fromstring(output)
    COMMENTARY_XPATH = "//div[@class='annotation_sidebar_unit']/annotation/standard-rich-content/div[@class='rich_text_formatting']"
    comment_html = root.xpath(COMMENTARY_XPATH)
    assert len(comment_html) == 1, len(comment_html)
    parts = [root.text]
    image_paths = []
    youtube_ids = []
    for c in comment_html[0].getchildren():
        parts.extend([c.text, c.tail])
        if c.tag == 'img':
            img_url = c.attrib['src']
            cf.get_image(img_url, os.path.join(tmp_dir_, img_url.split('/')[-1]))
        elif c.tag == 'embedly-youtube':
            youtube_ids.append(c.attrib['video-id'])

    parts = [root.tail]
    parts = list(filter(None, parts))
    return ''.join(parts), image_paths, youtube_ids
 

def parse_song(song_url):
    page_source = cf.get_page(song_url)
    assert isinstance(page_source, str)
    root = html.fromstring(page_source)
    LYRICS_XPATH = "//div[@class='lyrics']/section/p"
    lyrics_html = root.xpath(LYRICS_XPATH)
    assert len(lyrics_html) == 1
    sng = s.song()
    for c in lyrics_html[0].getchildren():
        text, link = parse_chunk(c)
        #print(text, end='')
        if link:
            #print('[{}]'.format(link), end='')
            commentary = parse_commentary(
                requests.compat.urljoin(song_url, link))
        else:
            commentary = None
        sng.add_chunk_with_commentary(text, commentary)
    return sng


def main():
    shutil.rmtree(tmp_dir_, ignore_errors=True)
    os.mkdir(tmp_dir_)
    if False:
        aes = 'https://genius.com/Aesop-rock-none-shall-pass-lyrics'
        john = 'https://genius.com/Johnyboy-the-demons-lyrics'
        eag = 'https://genius.com/Eagles-hotel-california-lyrics'
        song = parse_song(aes)
        #print(song)
        with open('/tmp/song.pcl', 'wb') as the_file:
            pickle.dump(song, the_file, pickle.HIGHEST_PROTOCOL)
    else:
        with open('/home/wf34/projects/genius_booklet/song.pcl', 'rb') as the_file:
            sng = pickle.load(the_file)
            song_tex = tc.build_tex(sng)
            tc.render(song_tex, tmp_dir_, '/tmp/song.pdf')
    #shutil.rmtree(tmp_dir_)
    

if '__main__' == __name__:
    if sys.version_info[0] < 3:
        assert False, 'tested with Python3 only'
    else:
        main()

