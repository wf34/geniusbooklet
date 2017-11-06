
import functools


def latexify(text):
    return text.replace('\n', '~\\newline \n')


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
            lchunks = [latexify(c) for c in self.chunks]
            return functools.reduce(lambda res, x : ''.join([res, x]), lchunks, '')


    def __str__(self):
        s = ''
        for i, c in enumerate(self.chunks):
            s += c[:10]
            s += self.commentaries[i][0][:10] if i in self.commentaries.keys() else '//'
            s += '\n'
        return s
