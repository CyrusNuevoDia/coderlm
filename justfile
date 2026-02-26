set shell := ["bash", "-euo", "pipefail", "-c"]

# Show available recipes
default:
    @just --list

# Run tests
test:
    bun test

# Format code (py, ts, or all)
fmt target="all":
    just _fmt-{{target}}

_fmt-all:
    just _fmt-ts
    just _fmt-py

_fmt-ts:
    bunx --bun ultracite fix

_fmt-py:
    ruff format
    ruff check --fix

# Lint code (py, ts, or all)
lint target="all":
    just _lint-{{target}}

_lint-all:
    just _lint-ts
    just _lint-py

_lint-ts:
    bunx --bun ultracite check

_lint-py:
    ruff format --check
    ruff check

# Publish to npm, pypi, or both (default: all, patch)
publish target="all" bump="patch":
    just _bump {{bump}}
    just _publish-{{target}}

# Bump version in package.json and pyproject.toml
_bump level:
    npm version {{level}} --no-git-tag-version
    #!/usr/bin/env bash
    version=$(jq -r .version package.json)
    perl -pi -e "s/^version = .*/version = \"$version\"/" pyproject.toml
    echo "Bumped to $version"

_publish-all:
    just _publish-npm
    just _publish-pypi

_publish-npm:
    npm publish

_publish-pypi:
    uv build
    uv publish
