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
const partRegex = /### Part [IVX]+ - [\s\S]+?(?=(?:### Part [IVX]+ - [\s\S]+?)|\n---\n)/g;
const chapterRegex = /#+\s*Chapter \d+[\s\S]*?(?=(### Part|\n#### Chapter|\n---|$))/g;
const questionRegex = /^Q:: ((?:.+\n)*)\n*A:: (.+(?:\n(?:^.{1,3}$|^.{4}(?<!<!--).*))*)/gm;
const targetDeckRegex =
  /TARGET DECK: (([A-Za-z0-9])*(::)*)* - (([A-Za-z0-9])* ?)* - (([A-Za-z0-9])* ?)*/g;
const deckInfoRegex = /---\n\nDECK INFO([\s\S]*)/g;
const notALineBreakRegex = /^(?![^\S\r\n]*$).*$/gm;
const notAlfaHyphenRegex = /[^a-zA-Z0-9\-]/gm;
// const tableRegex = /( *\n)*((?:.*\|.*\n)(?:.*\|.*\n)(?:.*\|.*\n)+)/g;
const tableRegex = /\n((?:.*\|.*\n)(?:.*\|.*\n)(?:.*\|.*\n)+)/g
const markdownImageRegex =/(!\[.*?\]\()(\.{0,2}\/{0,1})(.*?)\/(.*?)\)/g
const obsidianIdRegex = /<!--ID: [0-9]+-->/g;
//const questionRegex =
///^Q:: ((?:.+\n)*)\n*A:: (.+(?:\n(?:^.{1,3}$|^.{4}(?<!<!--).*))*)/gm;
const multipleSpacesRegex = / {2,}/gm
const questionStartRegex = /Q:: /g
const chapterStartRegex = /#### Chapter/g
const partStartRegex = /### Part/g
const diagonalCharRegex = /\//g
const chapterTitleRegex = /#### Chapter [0-9]+ - .*/g
const codeBlockStart = /```[A-Za-z0-9]+  /g
const codeBlockEnd = /```  /g
const nonAlfaNumRegex = /[^a-zA-Z0-9]/g
const doubleSpaceRegex = /( {2})$/gm
const endOfLineRegex = /(\s*)$/gm
const lastWordRegex = /[^\s]+$/gm;

// Function to recursively create directories
function createDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath);
  }
}

// Function to create a question markdown file
function createQuestionFile(filePath, question, answer, deckData) {
  //const content = `# Question\n\n${question}\n\n# Answer\n\n${answer}`;
  let prevId = "";

  try {
    const prevQuestion = fs.readFileSync(filePath, 'utf8');
    // const id = obsidianIdRegex.exec(prevQuestion);
    prevId = prevQuestion.match(obsidianIdRegex)[0] || "";
    if (prevId !== "") {
      prevId = `${prevId}\n`
    }
    // prevId = id[0];
  } catch (err) {
    //console.log(err);
  }

  //console.log(state);
  const questionState = `QUESTION STATUS: ${
    state === '' ? 'Safe to store' : 'Not safe to store'
  }`;
  const content = `${question}  \n${answer}\n${prevId}\n${deckData}\n\n${questionState}`;
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

// function checkCreation(questionsArray) {
  //let resultOfResults = '';
  //for (repath of questionsArray) {
  //const result = fs.readFileSync(repath, 'utf8');
  //console.log('=========================================');
  //console.log(result);
  //resultOfResults += '==============================';
  //resultOfResults += result;
  //}
  // fs.writeFileSync('./filePaths.txt', JSON.stringify(questionsArray));
// }

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
fileContents = addJumpLines(fileContents);

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
mainFolderName = mainFolderName.replace(multipleSpacesRegex, " ")

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
    .replace(questionStartRegex, '\nQ:: ')
    .replace(chapterStartRegex, '\n#### Chapter')
    .replace(partStartRegex, '\n### Part');
  chaptersInPart = chapterWithSepQuestions.match(chapterRegex);
  invalidQuestions.push(chapterWithSepQuestions.replace(questionRegex, ''));
  const chapterContainsQuestion = chapterWithSepQuestions.match(questionRegex);
  if (!(chapterContainsQuestion === null)) {
    partTitle = partTitle.replace(diagonalCharRegex, '-');
    partTitle = sanitizeFilename(partTitle)
    partTitle = partTitle.replace(multipleSpacesRegex, " ")
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
    .replace(chapterTitleRegex, '')}`
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
      chapterTitle = chapterTitle.replace(diagonalCharRegex, '-');
      chapterTitle = sanitizeFilename(chapterTitle)
      chapterTitle = chapterTitle.replace(multipleSpacesRegex, " ")
      chapterTitle = chapterTitle.substring(0,70)
      const parentPath = path.join(mainFolderName, partTitle, chapterTitle);
      createDirectory(parentPath);
      questionsHash[parentPath] = questionsInChapter ? questionsInChapter : [];
    }
  }
}

//fs.writeFileSync('./tes.txt', JSON.stringify(chaptersHash, undefined, '\t'));

for (let parentPath in questionsHash) {
  // let counter = 1
  const questions = questionsHash[parentPath];
  for (let question of questions) {
    // if (questionsAdded > 370) {
    // break;
    // }
    const questionAndAnswer = question.split('A:: ');
    let answerText = `A: ${questionAndAnswer.pop().trim()}`;
    const questionText = `Q: ${questionAndAnswer.pop().substring(3).trim()}`;


    // console.log(answerText)

    const containsImage = answerText.match(markdownImageRegex)
    if (containsImage) {
      // console.log(containsImage)
      // counter++
      answerText = answerText.replace(markdownImageRegex, (match, p1, p2, p3, p4) => {
        const dynamicText = p4.split('.').shift(); // Extract the text and remove file extension
        const relativePath = "../../../../" + (p3 ? p3 + "/" : "") + p4;
        return `![${dynamicText}](${relativePath})`;
      });
      // console.log("++++++++++++++++++++++++++++++++++++++++++++++")
      // console.log(test)
    }

    const isTable = tableRegex.exec(answerText)
    if (isTable) {
      answerText = answerText.replace(tableRegex, '\n\n$1');
    }



    answerText = answerText.replace(codeBlockStart, (matchText) => {
      return `${matchText.trim()}`
    })

    answerText = answerText.replace(codeBlockEnd, (matchText) => {
      return `${matchText.trim()}`
    })

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
      // .replace(nonAlfaNumRegex, '-')
      //.replace(diagonalCharRegex, '-')
      .toLowerCase();

    fileName = fileName.replace(diagonalCharRegex, '-');
    fileName = sanitizeFilename(fileName)
    fileName = fileName.replace(multipleSpacesRegex, " ")
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
// checkCreation(questionsCreated);
console.log('=======================================');
console.log(`|Questions added: ${questionsAdded - 1}                 |`);
console.log('=======================================');
// fs.writeFileSync('qanda.md', qandAResolved);

// fs.writeFileSync(filePath, fileContents, { flag: 'w' });

fs.writeFile(filePath, fileContents, function(err) {
  if(err) {
    return console.log(err);
  }
  console.log("The file was saved!");
});

function addJumpLines(text) {
  text = convertImages(text)
  // let count = 1
  text = text.replace(questionRegex, (selectedText) => {
    const question = selectedText.match(questionRegex)[0];
    const questionAndAnswer = question.split('A:: ');

    let questionText = questionAndAnswer[0];

    questionText = questionText.trim();
    questionText = questionText.replace(doubleSpaceRegex, ``);
    questionText = questionText.replace(endOfLineRegex, `  `);
    // questionText = questionText.replace(lastWordRegex, match => `${match}  `);

    let answerText = questionAndAnswer[1];

    answerText = answerText.replace(doubleSpaceRegex, ``);
    answerText = answerText.replace(endOfLineRegex, `  `);
    // answerText = answerText.replace(lastWordRegex, match => `${match}  `);

    const isTable = tableRegex.exec(answerText)
    if (isTable) {
       answerText = answerText.replace(tableRegex, '\n\n$1');
    }

    answerText = answerText.trim();


    // console.log(test)

    // if (count === 9) {
    //  console.log(`${questionText}\nA:: ${answerText}`)
    //}

    //count++

    return `${questionText}\nA:: ${answerText}`;
  });

  return text;
}

function convertImages (text) {
  const containsImage = text.match(markdownImageRegex)

  if (containsImage) {
    text = text.replace(markdownImageRegex, (match, p1, p2, p3, p4) => {
      const dynamicText = p4.split('.').shift(); // Extract the text and remove file extension
      const relativePath = "../" + (p3 ? p3 + "/" : "") + p4;
      return `![${dynamicText}](${relativePath})`;
    });
  }

  return text
}