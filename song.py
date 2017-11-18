
import functools


class song:
    def __init__(self):
        self.chunks = []
        self.commentaries = dict([])


    def add_chunk_with_commentary(self, chunk, commentary = None):
        assert isinstance(chunk, str)
        current_id = len(self.chunks)
        self.chunks.append(chunk)
        if commentary is not None:
            print('Adding really')
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
                    \\begin{longtable}{p{6cm}p{10cm}} \\hline \\ 
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
        if ci in self.commentaries.keys():
            comm_text = self.latexify(self.commentaries[ci][0], 'no_breaks')
        else:
            comm_text = '\\phantom{.}'

        return '\makecell[l]{{{}}} & {} \\ \\hline \n'.format(c, comm_text)



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
        

