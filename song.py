
import os
import functools
import itertools
import content_fetch as cf

tmp_dir_ = '/tmp/geniusbooklet'


def build_latex_image_code_(image_path):
    assert os.path.isfile(image_path)
    image_name = os.path.basename(image_path)
    return '\\includegraphics[width={{}}\linewidth]{{{}}}'.format(image_name)


def build_latex_image_code(image_path, href = None):
    if href:
        return '\\href{{{}}}{{{}}}'.format(href,
                                           build_latex_image_code_(image_path))
    else:
        return build_latex_image_code_(image_path)


def build_yt_image(yt_vid_code):
    th_dst = os.path.join(s.tmp_dir_, yt_vid_code + '.png')
    cf.get_youtube_thumbnail(yt_vid_code, th_dst)
    vid_url = 'https://www.youtube.com/watch?v={}'.format(yt_vid_code)
    return build_latex_image_code(th_dst, vid_url)


def build_mosaic_latex_code(pics):
    len_ = len(pics)
    assert len_ > 0
    width = min(3, len_)
    height = 1 if len_ <= width else len_ // width
    assert width * height >= len_
    
    pic_codes = []
    for hangler, pic_source in pics:
        pic_tex_code = hangler(pic_source)
        fixed_pic_tex_code = pic_tex_code.format(1. / width)
        pic_codes.append(fixed_pic_tex_code)
    print(pic_codes)
    mosaic_header = '\\begin{minipage}{10cm} \\begin{tabular}'
    mosaic_footer = '\\end{minipage}' 
    return 'YYY'


class song:
    def __init__(self):
        self.chunks = []
        self.commentaries = dict([])


    def add_chunk_with_commentary(self, chunk, commentary = None):
        assert isinstance(chunk, str)
        current_id = len(self.chunks)
        self.chunks.append(chunk)
        if commentary is not None:
            assert isinstance(commentary, tuple) and len(commentary) == 3
            self.commentaries[current_id] = commentary


    def get_value(self, p):
        if p == 'title':
            return 'XXX'
        elif p == 'lyrics':
            lchunks = [self.latexify(c, 'for_normal_text', False) for c in self.chunks]
            return functools.reduce(lambda res, x : ''.join([res, x]), lchunks, '')
        elif p == 'commented_lyrics':
            return self.build_commented_table()
        elif p == 'tmp_dir':
            return tmp_dir_ + '/'
        else:
            assert False, 'unreachable'


    def __str__(self):
        s = ''
        for i, c in enumerate(self.chunks):
            s += c[:10]
            s += self.commentaries[i][0][:10] if i in self.commentaries.keys() else '//'
            s += '\n'
        return s


    def build_commented_table(self):
        table = ''
        header = '''\\begin{center}
                    \\begin{longtable}{p{6cm}p{10cm}} \\hline \\\\
                 '''
        footer = '''\\end{longtable}
                    \\end{center}
                 '''
        table += header
        for ci in range(len(self.chunks)):
            table += self.build_commetary_row(ci)
        table += footer
        return table


    def build_commetary_row(self, ci):
        c = self.latexify(self.chunks[ci], 'for_cell')
        is_empty = not any([all([char != x for x in ['\\', ' ']]) for char in c])
        if is_empty:
            assert ci not in self.commentaries.keys()
            return ''
        
        comm_text = ''
        dummy = '\\phantom{.}'
        if ci in self.commentaries.keys():
            comm_text = self.latexify(self.commentaries[ci][0], 'no_breaks')
            img_block = self.build_image_block(ci)
            separator = '\\hline' if img_block == '' else ''
        else:
            comm_text = dummy
            img_block = dummy
            separator = ''

        return '\makecell[l]{{{}}} & {} \\\\ {} \n'.format(c, comm_text, separator) + \
               img_block


    def build_image_block(self, ci):
        assert ci in self.commentaries.keys()
        labels = list(itertools.chain.from_iterable(
            [[l] * len(self.commentaries[ci][i]) \
                for i, l in zip(range(1, 3), ['image', 'yt'])]))
        entries = list(itertools.chain.from_iterable(
            [self.commentaries[ci][i] for i in range(1, 3)]))

        def get_proc_func(label):
            if label == 'image':
                return build_latex_image_code
            elif label == 'yt':
                return build_yt_image

        handler_image_pairs = [(get_proc_func(l), e) \
            for l, e in zip(labels, entries)]
        if len(handler_image_pairs) == 0:
            return ''
        return '\\phantom{{.}} & {} \\\\ \\hline \n'.format(
            build_mosaic_latex_code(handler_image_pairs))


    def latexify(self, text, line_break_style, is_strip = True):
        if line_break_style == 'for_cell':
            text = text.replace('\n', '\\\\')
            if text.startswith('\\\\'):
                text = text[2:]
        elif line_break_style == 'for_normal_text':
            text = text.replace('\n', '~\\newline \n')
        elif line_break_style == 'no_breaks':
            text = text.replace('\n', ' ')
        else:
            assert False, 'unreachable'
        if is_strip:
            text = text.strip('\\\n ')
        return text
        

