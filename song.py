
import functools


class song:
    def __init__(self):
        self.chunks = []
        self.commentaries = {}


    def add_chunk_with_commentary(self, chunk, commentary = None):
        assert isinstance(chunk, str)
        current_id = len(self.chunks)
        self.chunks.append(chunk)
        if commentary:
            assert isinstance(commentary, tuple) and len(commentary) == 3
            self.commentaries[current_id] = commentary


    def get_value(self, p):
        if p == 'title':
            return 'XXX'
        elif p == 'lyrics':
            lchunks = [self.latexify(c) for c in self.chunks]
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
                    \\begin{longtable} { l l }
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
        c = self.latexify(self.chunks[ci], True)
        is_empty = not any([all([char != x for x in ['\\', ' ']]) for char in c])
        if is_empty:
            print(c, 'was filtered out')
            assert ci not in self.commentaries.keys()
            return ''
        if c.startswith('\\\\'):
            c = c[2:]
        comm_text = ''
        if ci in self.commentaries.keys():
            comm_text = 'have comm;'
        else:
            comm_text = 'no comm'

        return '\makecell[l]{{{}}} & {} \\\\ \n'.format(c, comm_text)


    def latexify(self, text, cell = False):
        if cell:
            return text.replace('\n', '\\\\')
        else:
            return text.replace('\n', '~\\newline \n')
        

