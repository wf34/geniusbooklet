import subprocess
import random
import time
import os
import wget

random.seed(34)

def insert_random_delay(f, low = 0.005, high = 0.5):
    def wrapper(*args, **kwargs):
        time.sleep(random.uniform(low, high))
        return f(*args, **kwargs)
    return wrapper

@insert_random_delay
def get_page(url):
    HEADLESS_GOOGLE_CMD = 'google-chrome-stable --headless --disable-gpu --dump-dom'
    target = '{} {}'.format(HEADLESS_GOOGLE_CMD, url)
    return subprocess.getoutput(target)


@insert_random_delay
def get_image(url, destination):
    wget.download(url, out = destination)
    assert os.path.isfile(destination)


@insert_random_delay
def get_youtube_video():
    assert False

