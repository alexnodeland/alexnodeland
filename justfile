# The repo is a monorepo of two apps. Each has its own justfile and toolchain;
# these modules expose them as `just web <recipe>` and `just model <recipe>`,
# and the recipes below are the few that cross the boundary.
#
#   just web dev          the site's dev server
#   just model train      fine-tune the site model
#   just --list web       every recipe of one app

mod web 'apps/web'
mod model 'apps/model'

# List available recipes (each app's own are under `just --list <app>`)
default:
    @just --list --list-submodules

# Install both apps' dependencies
install:
    cd apps/web && npm install
    cd apps/model && uv sync --extra train --extra tracking --extra dev

# Export the site's content and rebuild the training corpus from it
corpus:
    cd apps/web && npm run build:content
    cd apps/model && uv run site-needle corpus build

# Is the published model current with the site's content?
corpus-status:
    cd apps/web && npm run build:content
    cd apps/model && uv run site-needle corpus status

# Content export, corpus, LoRA fine-tune, export, evaluation, report
pipeline *args:
    cd apps/web && npm run build:content
    cd apps/model && uv run site-needle pipeline {{args}}

# Every fast check in both apps — what CI runs on a pull request
check:
    cd apps/web && npm run code-quality && npm test
    cd apps/model && uv run ruff check . && uv run pytest -q
