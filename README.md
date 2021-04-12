# notion-backup
Backups your notion content to gihub repo. Also creates README.md with root pages links.

# how to use:
1. Create empty repo
2. Go to Actions and pad paste into workflow:
```javascript
name: "Notion backup"

on:
  workflow_dispatch:
  schedule:
    -   cron: "0 1 * * *"

jobs:
  backup:
    name: Backup
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '12'

      - uses: porohkun/notion-backup@v1
        env:
          NOTION_TOKEN: ${{ secrets.NOTION_TOKEN }}
          NOTION_SPACE_ID: ${{ secrets.NOTION_SPACE_ID }}
          NOTION_TIMEZONE: America/Los_Angeles  //optional. default: America/Los_Angeles
          NOTION_LOCALE: en                     //optional. default: en
          EXPORT_PATH: content                  //optional. default: content
      
      - uses: elstudio/actions-js-build/commit@v3
        with:
          commitMessage: Notion backup
```
3. Create repo secrets NOTION_TOKEN and NOTION_SPACE_ID (how to get it: https://artur-en.medium.com/automated-notion-backups-f6af4edc298d)
