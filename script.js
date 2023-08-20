const fs = require('fs');
const path = require('path');
let state = null; // "" = "Saved"
let questionsAdded = 1;
let questionsCreated = [];
let qandAResolved = `\n`;

// Regular expressions for parsing
const mainFolderRegex = /^# (.+)/;
//const partRegex =
///### Part [IVX]+ - [\s\S]+?(?=(?:### Part [IVX]+ - [\s\S]+?)|\n---\n|\Z)/g;
const partRegex =
  /### Part [IVX]+ - [\s\S]+?(?=(?:### Part [IVX]+ - [\s\S]+?)|\n---\n)/g;
const chapterRegex =
  /#+\s*Chapter \d+[\s\S]*?(?=(### Part|\n#### Chapter|\n---|$))/g;
const questionRegex =
  /^P: ((?:.+\n)*)\n*R: (.+(?:\n(?:^.{1,3}$|^.{4}(?<!<!--).*))*)/gm;
const targetDeckRegex =
  /TARGET DECK: (([A-Za-z0-9])*(::)*)* - (([A-Za-z0-9])* ?)* - (([A-Za-z0-9])* ?)*/g;
const deckInfoRegex = /---\n\nDECK INFO([\s\S]*)/g;
const notALineBreakRegex = /^(?![^\S\r\n]*$).*$/gm;
const notAlfaHyphenRegex = /[^a-zA-Z0-9\-]/gm;
// const tableRegex = /( *\n)*((?:.*\|.*\n)(?:.*\|.*\n)(?:.*\|.*\n)+)/g;
const tableRegex = /\n((?:.*\|.*\n)(?:.*\|.*\n)(?:.*\|.*\n)+)/g

// Function to recursively create directories
function createDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath);
  }
}

// Function to create a question markdown file
function createQuestionFile(filePath, question, answer, deckData) {
  //const content = `# Question\n\n${question}\n\n# Answer\n\n${answer}`;
  let prevId = '';
  const obsidianIdRegex = /<!--ID: [0-9]+-->/g;

  try {
    const prevQuestion = fs.readFileSync(filePath, 'utf8');
    const id = obsidianIdRegex.exec(prevQuestion);
    prevId = id[0];
  } catch (err) {
    //console.log(err);
  }
  //const questionRegex =
  ///^P: ((?:.+\n)*)\n*R: (.+(?:\n(?:^.{1,3}$|^.{4}(?<!<!--).*))*)/gm;

  //console.log(state);
  const questionState = `QUESTION STATUS: ${
    state === '' ? 'Safe to store' : 'Not safe to store'
  }`;
  const content = `${question}  \n${answer}\n${prevId}\n\n${deckData}\n${questionState}`;
  //const questionsCount = content.match(questionRegex);
  //console.log(questionsCount);
  //if (questionsCount > 1) {
  //console.log(questionsCount);
  //}
  //console.log(filePath);
  fs.writeFileSync(filePath, content);
  //fs.writeFile(filePath, content, { flag: 'w' }, function (err) {
  //if (err) return console.error(err);
  //fs.readFile(filePath, 'utf-8', function (err, data) {
  //if (err) return console.error(err);
  //console.log(data);
  questionsAdded++;
  //console.log(`N: ${questionsAdded} - ${question}`);
  //console.log('---');
  //});
  //});
  questionsCreated.push(filePath);
}

function checkCreation(questionsArray) {
  //let resultOfResults = '';
  //for (repath of questionsArray) {
  //const result = fs.readFileSync(repath, 'utf8');
  //console.log('=========================================');
  //console.log(result);
  //resultOfResults += '==============================';
  //resultOfResults += result;
  //}
  fs.writeFileSync('./filePaths.txt', JSON.stringify(questionsArray));
}

function sanitizeFilename(filename) {
  return filename.replace(notAlfaHyphenRegex, " ").trim()
}

// Read the text file path from command line arguments
const args = process.argv.slice(2);
const filePath = args[0];
let parentRoute = filePath.split('/');
parentRoute.pop()
parentRoute = parentRoute.join("/")

// Read the file contents
let fileContents = fs.readFileSync(filePath, 'utf8');
fs.writeFileSync(filePath, addJumpLines(fileContents));
fileContents = fs.readFileSync(filePath, 'utf8');

try {
  const stateText = fs.readFileSync('./state.txt', 'utf8');
  console.log('=======================================');
  console.log(
    `|QUESTION STATUS: ${
      stateText === 'null' ? 'Safe to store       |' : 'Not safe to store   |'
    }`
  );

  if (stateText === 'null') {
    state = '';
    fs.writeFileSync('./state.txt', `${state}`);
  } else {
    state = null;
    fs.writeFileSync('./state.txt', `${state}`);
  }
} catch (err) {
  fs.writeFileSync('./state.txt', `${state}`);
}

const mainFolderMatch = fileContents.match(mainFolderRegex);
let mainFolderName = mainFolderMatch ? mainFolderMatch[1] : '';

if (!mainFolderName) {
  console.log('Main folder name not found!');
  process.exit(1);
}

mainFolderName = sanitizeFilename(mainFolderName)
mainFolderName = mainFolderName.replace(/ {2,}/gm, " ")

mainFolderName = path.join(parentRoute, mainFolderName);
//console.log(mainFolderName);

createDirectory(mainFolderName);

let invalidQuestions = [];

const deckInfo = fileContents.match(deckInfoRegex).toString();
const targetDeckInfo = targetDeckRegex.exec(deckInfo)[0];
const parts = fileContents.match(partRegex);
const chaptersHash = {};
const questionsHash = {};

for (let part of parts) {
  const lines = part.split('\n');
  let partTitle = lines[0].substring(4).trim();
  let chaptersInPart = part.match(chapterRegex).join('\n\n');
  const chapterWithoutLineBreaks = chaptersInPart
    .match(notALineBreakRegex)
    .join('\n');
  const chapterWithSepQuestions = chapterWithoutLineBreaks
    .replace(/P: /g, '\nP: ')
    .replace(/#### Chapter/g, '\n#### Chapter')
    .replace(/### Part/g, '\n### Part');
  chaptersInPart = chapterWithSepQuestions.match(chapterRegex);
  invalidQuestions.push(chapterWithSepQuestions.replace(questionRegex, ''));
  const chapterContainsQuestion = chapterWithSepQuestions.match(questionRegex);
  if (!(chapterContainsQuestion === null)) {
    partTitle = partTitle.replace(/\//g, '-');
    partTitle = sanitizeFilename(partTitle)
    partTitle = partTitle.replace(/ {2,}/gm, " ")
    partTitle = partTitle.substring(0,70)
    chaptersHash[partTitle] = chaptersInPart;
    const parentPath = path.join(mainFolderName, partTitle);
    createDirectory(parentPath);
  }
}

//console.log(chaptersHash);

fs.writeFileSync(
  './bad-questions.md',
  `# Bad questions\n${invalidQuestions
    .toString()
    .replace(/#### Chapter [0-9]+ - .*/g, '')}`
);

//fs.writeFileSync('./test.txt', JSON.stringify(chaptersHash, undefined, '\t'));

for (let partTitle in chaptersHash) {
  const chapters = chaptersHash[partTitle];
  for (let chapter of chapters) {
    const lines = chapter.split('\n');
    let chapterTitle = lines[0].substring(5).trim();
    const questionsInChapter = chapter.match(questionRegex);
    const chapterContainsQuestion = chapter.match(questionRegex);
    if (!(chapterContainsQuestion === null)) {
      chapterTitle = chapterTitle.replace(/\//g, '-');
      chapterTitle = sanitizeFilename(chapterTitle)
      chapterTitle = chapterTitle.replace(/ {2,}/gm, " ")
      chapterTitle = chapterTitle.substring(0,70)
      const parentPath = path.join(mainFolderName, partTitle, chapterTitle);
      createDirectory(parentPath);
      questionsHash[parentPath] = questionsInChapter ? questionsInChapter : [];
    }
  }
}

//fs.writeFileSync('./tes.txt', JSON.stringify(chaptersHash, undefined, '\t'));

for (let parentPath in questionsHash) {
  const questions = questionsHash[parentPath];
  for (let question of questions) {
    //if (questionsAdded > 5) {
    //break;
    //}
    const questionAndAnswer = question.split('R: ');
    let answerText = `A: ${questionAndAnswer.pop().trim()}`;
    const questionText = `Q: ${questionAndAnswer.pop().substring(3).trim()}`;

    const isTable = tableRegex.exec(answerText)
    if (isTable) {
      answerText = answerText.replace(tableRegex, '\n\n$1');
    }

    qandAResolved += `${questionText}\n${answerText}\n\n`;
    //if (questionsAdded === 63) {
    //console.log(typeof questionText);
    //console.log(typeof answerText);
    //console.log(questionText);
    //console.log(answerText);
    //}/
    let fileName = questionText
      .substring(3, 51)
      // .trim()
      // .replace(/[^a-zA-Z0-9]/g, '-')
      //.replace(/\//g, '-')
      .toLowerCase();

    fileName = fileName.replace(/\//g, '-');
    fileName = sanitizeFilename(fileName)
    fileName = fileName.replace(/ {2,}/gm, " ")
    let newFileName = fileName.charAt(0).toUpperCase() + fileName.slice(1);
    //fileName = fileName.substring(0, 51);
    const filePath = path.join(parentPath, `${questionsAdded} - ${newFileName}.md`);
    //console.log(filePath);

    //console.log(parentPath);
    const sections = parentPath.split('/');
    const chapter = sections.pop();
    const part = sections.pop();
    const currentDeck = `${targetDeckInfo}::${part}::${chapter}`;
    const fullDeckInfo = deckInfo.replace(targetDeckRegex, currentDeck);

    createQuestionFile(filePath, questionText, answerText, fullDeckInfo);
  }
}

//console.log(questionsCreated);
checkCreation(questionsCreated);
console.log('=======================================');
console.log(`|Questions added: ${questionsAdded - 1}                 |`);
console.log('=======================================');
fs.writeFileSync('qanda.md', qandAResolved);

function addJumpLines(text) {
  text = text.replace(questionRegex, (selectedText) => {
    const question = selectedText.match(questionRegex)[0];
    const questionAndAnswer = question.split('R: ');

    let questionText = questionAndAnswer[0];
    questionText = questionText.trim();
    questionText = questionText.replace(/( {2})$/gm, ``);
    questionText = questionText.replace(/(\s*)$/gm, `  `);

    let answerText = questionAndAnswer[1];
    answerText = answerText.replace(/( {2})$/gm, ``);
    answerText = answerText.replace(/(\s*)$/gm, `  `);

    const isTable = tableRegex.exec(answerText)
    if (isTable) {
       answerText = answerText.replace(tableRegex, '\n\n$1');
    }

    answerText = answerText.trim();

    return `${questionText}\nR: ${answerText}`;
  });

  return text;
}