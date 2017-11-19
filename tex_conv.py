import os
import sys
import string
import subprocess
import random 

import song as s


def get_random_string(l = 20):
    return ''.join(random.choice(string.ascii_uppercase + string.digits) for _ in range(l))


def fill_in_placeholders(template, sng):
    placeholders = ['tmp_dir', 'title', 'lyrics', 'commented_lyrics']
    for p in placeholders:
        template = template.replace('%' + p, sng.get_value(p))
    return template


def build_tex(sng):
    TEX_SONG_TEMPLATE = 'song_template.tex'
    assert isinstance(sng, s.song), type(sng)
    script_dir = os.path.dirname(sys.argv[0])
    with open(os.path.join(script_dir, TEX_SONG_TEMPLATE), 'r') as the_file:
        template = the_file.read()
        return fill_in_placeholders(template, sng)


def render(tex, interm_dir, dst):
    assert isinstance(tex, str)
    assert os.path.isdir(interm_dir)
    dst_dir = os.path.dirname(dst)
    assert os.path.isdir(dst_dir)
    complete_tex = os.path.join(interm_dir, get_random_string() + '.tex')
    with open(complete_tex, 'w') as the_file:
        the_file.write(tex)
    RUN = 'pdflatex -halt-on-error -interaction=nonstopmode -output-directory={} {}'
    subprocess.check_call(RUN.format(dst_dir, complete_tex), shell=True)
