import os
import sys


def main():
    script = os.path.join(os.path.dirname(__file__), "coderlm")
    os.execvp("bash", ["bash", script] + sys.argv[1:])
