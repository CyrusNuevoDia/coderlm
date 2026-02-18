import os
import sys


def main():
    script = os.path.join(os.path.dirname(__file__), "coding-agent-rlm")
    os.execvp("bash", ["bash", script] + sys.argv[1:])
