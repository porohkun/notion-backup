#!/usr/bin/env node

var { NOTION_TOKEN, NOTION_SPACE_ID, NOTION_TIMEZONE, NOTION_LOCALE, EXPORT_PATH } = process.env;
var archiveName = "notion.zip";
var directoryName = EXPORT_PATH || 'docs';

var cwd = process.cwd();
var axios = require('axios');
var { join } = require('path');
var { mkdirSync, rmdirSync, createWriteStream, unlinkSync, readdirSync, lstatSync, writeFileSync } = require('fs');
var extract = require('extract-zip');

var client = axios.create({
  baseURL: 'https://www.notion.so/api/v3',
  headers: {
    Cookie: `token_v2=${NOTION_TOKEN}`
  },
});

function isDirectory(path)
{
  return lstatSync(path).isDirectory();
}

function processError(error)
{
  console.error(error);
  process.exit(1);
}

async function delay(milliseconds)
{
  return new Promise(resolve => setTimeout(() => resolve("Done"), milliseconds));
}

async function enqueueTask()
{
  let result;
  await client.post('enqueueTask', {
    task: {
      eventName: 'exportSpace',
      request: {
        spaceId: NOTION_SPACE_ID,
        exportOptions: {
          exportType: 'markdown',
          timeZone: NOTION_TIMEZONE || 'America/Los_Angeles',
          locale: NOTION_LOCALE || 'en'
        }
      }
    }
  })
  .then(response => result = response.data.taskId)
  .catch(error => processError(error));
  return result;
}

async function getTask(taskId)
{
  let result;
  await client.post('getTasks', { taskIds: [taskId] })
  .then(response => result = response.data.results.find(t => t.id == taskId))
  .catch(error => processError(error));
  return result;
}

async function downloadArchive(exportURL, archivePath)
{
  await client({
    method: 'GET',
    url: exportURL,
    responseType: 'stream'
  })
  .then(async response =>
  {
    var stream = response.data.pipe(createWriteStream(archivePath));
    await new Promise((resolve, reject) =>
    {
      stream.on('close', resolve);
      stream.on('error', reject);
    });
  })
  .catch(error => processError(error));
}

function parseFileName(entry)
{
  var regexp = /^(.*)\s([\w\d]{32})\.(\w{2,3})$/;
  var match = entry.match(regexp);
  return  {
    source: match[0],
    name: match[1],
    hash: match[2],
    ext: match[3]
  }
}

function createReadme(directoryPath)
{
  var readme = '# Notion topics\n\n';
  for (entry of readdirSync(directoryPath))
    if (!isDirectory(join(directoryPath, entry)))
    {
      let file = parseFileName(entry);
      readme += `[${file.name}](${directoryName}/${encodeURI(file.source)})\n\n`;
    }
  writeFileSync('README.md', readme);
}

async function main ()
{
  if (!NOTION_TOKEN)
    throw new Error('NOTION_TOKEN not found in eviroment');
  if (!NOTION_SPACE_ID)
    throw new Error('NOTION_SPACE_ID not found in eviroment');

  var directoryPath = join(cwd, directoryName);
  var archivePath = join(cwd, archiveName);

  rmdirSync(directoryPath, { recursive: true });
  mkdirSync(directoryPath, { recursive: true });

  console.info('Enqueue task');
  var taskId = await enqueueTask();
  do
  {
    await delay(5000);
    var task = await getTask(taskId);
    console.info(`Pages exported: ${task.status.pagesExported}`);
  } while (task.state != 'success');

  console.info('Begin download');
  await downloadArchive(task.status.exportURL, archivePath);
  console.info('Download end');

  await extract(archivePath, { dir: directoryPath })
  .catch(error => processError(error));
  unlinkSync(archivePath);

  createReadme(directoryPath);
}

main();