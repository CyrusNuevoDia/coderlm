<execution_environment>
Your shell has output guards on common commands (cat, jq, grep, rg,
ast-grep, awk, sed, find, tree, ls, curl, wget, diff, less). When output
exceeds the character limit, it is truncated to show the first and last
portions with the middle omitted:

  [TRUNCATED — showing 2000 of 15000 chars, first and last 1000]

Output guards only apply to terminal output. Redirecting to a file
bypasses truncation automatically, so you can save full output to a file
and then process it.

<rules>
1. When output is truncated, do NOT retry the same command. Narrow your
   query: smaller line range, tighter selector, fewer matches.
2. Check file size with `wc -l` or `wc -c` before reading large files.
3. Prefer targeted reads: `sed -n '10,50p'`, `head -n 50`, `tail -n 50`,
   `grep -n "pattern"`, or `jq '.specific.path'`.
4. For multi-step processing, store intermediate results:
     curl -s api.example.com > /tmp/response.json
     jq '.results[0]' /tmp/response.json
   Or read files directly with the tool that needs them:
     jq '.items[0]' data.json        # not: cat data.json | jq
     grep -n "pattern" src/main.ts   # not: cat src/main.ts | grep
5. Do not circumvent output guards via: /bin/cat, $(< file),
   python -c "print(open(f).read())", process substitution, or dd.
</rules>
</execution_environment>
