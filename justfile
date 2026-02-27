set shell := ["bash", "-euo", "pipefail", "-c"]

# Show available recipes
default:
    @just --list

# Run tests
test:
    bun test

# Format code (py, ts, or all)
fmt target="all":
    just _fmt-{{ target }}

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
    just _lint-{{ target }}

_lint-all:
    just _lint-ts
    just _lint-py

_lint-ts:
    bunx --bun ultracite check

_lint-py:
    ruff format --check
    ruff check

# Publish current version to npm, pypi, or both (default: all)
publish target:
    #!/usr/bin/env bash
    set -euo pipefail
    case "{{ target }}" in
        npm)  npm publish ;;
        pypi) uv build && uv publish ;;
    esac

# Bump version in package.json and pyproject.toml (default: patch)
bump level="patch":
    #!/usr/bin/env bash
    set -euo pipefail
    npm version {{ level }} --no-git-tag-version
    version=$(jq -r .version package.json)
    perl -pi -e "s/^version = .*/version = \"$version\"/" pyproject.toml
