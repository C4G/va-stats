# C4G DEVELOPMENT/PRODUCTION PIPELINE

## Introduction

This document describes the process of pushing team code changes to a C4G project codebase. The concept was visualized a while back and was completed on Friday, 2024-08-23, by Justin McLellan, who originally joined the C4G Team in the Fall 2024 Semester as a member of the CS8903-OSV TA team.

## Process Summary

Essentially, you will take the following steps:

- Please ensure you receive notifications from [GaTech CS-6150 GitHub](https://github.gatech.edu/orgs/cs-6150-computing-for-good/dashboard) (this is the default).
- Create your feature branch as a new branch off of staging, or main if the staging branch does not exist.
- Push to your remote feature branch as you work.
- Once your feature is complete you can create a Pull Request (PR) to the default branch, Typically staging or main.
- Every feature is squash merged into the staging/main branch.
- Each PR requires at least one approval and all comments to be resolved before merging.
- After reviewing comments, the mentor will merge the PR to the staging or main branch after thorough testing is completed.
- If a project contains a staging branch: Once the code is merged to the staging site and verified by partners / mentors a new PR will be created and merged (not squashed) into the main branch.

## Critical Folders/Files/URLs

(check with your mentor if you cannot determine locations)

- Github workflow files
  - `preview.yaml` / `ci.yaml`- used to build, lint, and test the code
  - `staging.yaml` - used to build and push to the staging site for verification
  - `production.yaml` / `cd.yaml` - used to build and push to the production site
- Development site URL
- Production site URL
