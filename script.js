import fs from 'fs';
import path from 'path';
import prettier from 'prettier';

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
// const questionRegex = /^Q:: ((?:.+\n)*)\n*A:: (.+(?:\n(?:^.{1,3}$|^.{4}(?<!<!--).*))*)/gm;
const questionRegex = /^Q:: ((?:(?!A::)[\s\S])+)\n*A:: (.+(?:\n(?:^.{1,3}$|^.{4}(?<!<!--).*))*)/gm
// const targetDeckRegex =
//   /TARGET DECK: (([A-Za-z0-9])*(::)*)* - (([A-Za-z0-9])* ?)* - (([A-Za-z0-9])* ?)*/g;
const targetDeckRegex = /TARGET DECK: .*/g
const deckInfoRegex = /---\n\nDECK INFO([\s\S]*)/g;
const notALineBreakRegex = /^(?![^\S\r\n]*$).*$/gm;
const notAlfaHyphenRegex = /[^a-zA-Z0-9\-]/gm;
// const tableRegex = /( *\n)*((?:.*\|.*\n)(?:.*\|.*\n)(?:.*\|.*\n)+)/g;
const tableRegex = /\n((?:.*\|.*\n)(?:.*\|.*\n)(?:.*\|.*\n)+)/g
// const markdownImageRegex = /(!\[.*?\]\()(\.{0,2}\/{0,1})(.*?)\/(.*?)\)/g
const markdownImageRegex = /(!\[.*?\]\()(\.{0,2}\/{0,1})?((?!https?:\/\/)[^\/]*?)\/(.*?)\)/g
const obsidianIdRegex = /<!--ID: [0-9]+-->/g;
//const questionRegex =
///^Q:: ((?:.+\n)*)\n*A:: (.+(?:\n(?:^.{1,3}$|^.{4}(?<!<!--).*))*)/gm;
const multipleSpacesRegex = / {2,}/gm
const questionStartRegex = /Q:: /g
const chapterStartRegex = /#### Chapter/g
const partStartRegex = /### Part/g
const diagonalCharRegex = /\//g
const chapterTitleRegex = /#### Chapter [0-9]+ - .*/g
const codeBlockStart = / *```[A-Za-z0-9]+(  )*/g
const codeBlockEnd = / *```(  )*/g
const nonAlfaNumRegex = /[^a-zA-Z0-9]/g
const doubleSpaceRegex = /(\?* {2})$/gm
const endOfLineRegex = /(\s*)$/gm
const lastWordRegex = /[^\s]+$/gm;
let indexTable = `\n| ID | File name / path | Part | Chapter |\n| --- | --- | --- | --- |\n`
let prevPartCount = 0
let prevChapterCount = 0

// Function to recursively create directories
function createDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath);
  }
}

async function createQuestionAsync(content, filePath) {

  // console.log(content)
  let prevInfo = ""
  content = content.replace(/---\n\nDECK INFO(.*\n*)*/g, (selectedText) => {
    prevInfo = selectedText
    return "DECK INFO GOES HERE"
  })

  // console.log("-------------")
  // console.log(prevInfo)

  let formattedContent = await prettier.format(content, {
    experimentalTernaries: true,
    printWidth: 80,
    tabWidth: 2,
    useTabs: false,
    semi: true,
    singleQuote: true,
    quoteProps: "consistent",
    jsxSingleQuote: true,
    trailingComma: "all",
    bracketSpacing: true,
    bracketSameLine: false,
    arrowParens: "always",
    parser: 'markdown',
    proseWrap: "always",
    htmlWhitespaceSensitivity: "css",
    vueIndentScriptAndStyle: false,
    embeddedLanguageFormatting: "auto",
    singleAttributePerLine: false
  });

  formattedContent = formattedContent.replace(/DECK INFO GOES HERE/g, prevInfo)

  formattedContent = formattedContent.replace(/\s*# Q: REPLACE ME\n/g,`${divider20} Question ${divider20}  \n`)
  formattedContent = formattedContent.replace(/\s*# A: REPLACE ME\n/g,`  \n\n${divider20} Answer ${divider20}  \n`)

  // Fix lists
  const tripleSpaceRegex = /(^ {3,})/gm
  formattedContent = formattedContent.replace(tripleSpaceRegex, `$1 `)

  // fs.writeFileSync(filePath, formattedContent, 'utf-8');
  await fs.promises.writeFile(filePath, formattedContent);
}

// Function to create a question markdown file
function createQuestionFile(filePath, question, answer, deckData, fileName) {
  //const content = `# Question\n\n${question}\n\n# Answer\n\n${answer}`;
  let prevId = "";

  const pathArray = filePath.split("/").slice(2)
  const shortFilePath = pathArray.join("/").replaceAll(" ", "%20")
  const partRaw = pathArray[1]
  const partArr = partRaw.substring(4).split("-")
  const partNum = romanToNumber(partArr[0].trim())
  const partTitle = partArr[1].trim()
  const chapterRaw = pathArray[2]
  const chapterArr = chapterRaw.substring(7).split("-")
  const chapterNum = parseInt(chapterArr[0].trim())
  const chapterTitle = chapterArr[1].trim()
  if (partNum !== prevPartCount) {
    let divider = `| **-** | **${partTitle}** | **${partNum}** | **-** |\n`
    indexTable += divider
    prevPartCount = partNum
  }
  if (chapterNum !== prevChapterCount) {
    let divider = `| **-** | **${partTitle} > ${chapterTitle}** | **${partNum}** | **${chapterNum}** |\n`
    indexTable += divider
    prevChapterCount = chapterNum
  }
  let textForTable = `| [${questionsAdded}](#id${questionsAdded}) | [${fileName}](./${shortFilePath}) | ${partNum} | ${chapterNum} |\n`
  indexTable += textForTable

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

  const fixPart = partRaw.replaceAll(" ", "-").replaceAll("---","-")
  const fixChapter = chapterRaw.replaceAll(" ", "-").replaceAll("---","-")
  const fixMainTitle = pathArray[0].replaceAll(" ", "-").replaceAll("---","-")
  const fixFileName = fileName.replaceAll(" ", "-").replaceAll("---","-")
  const deckDataPlusId = deckData.replace(/(FILE TAGS:.*)/g, `$1::#${fixMainTitle}::#${fixPart}::#${fixChapter}::#${questionsAdded}-${fixFileName}`)
  const idDivider = `  \n\n${divider20} Id ${divider20}  \n${questionsAdded}`


  const content = `${question}  \n${answer}${idDivider}\n${prevId}\n${deckDataPlusId}\n${questionState}`;
  //const questionsCount = content.match(questionRegex);
  //console.log(questionsCount);
  //if (questionsCount > 1) {
  //console.log(questionsCount);
  //}
  //console.log(filePath);

  createQuestionAsync(content,filePath)

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

// fileContents = fileContents.replace(/(TARGET DECK:.*)/g, (selectedText) => {
//   selectedText = selectedText.replaceAll(" ", "-")
//   selectedText = selectedText.replaceAll("---", "-")
//   return `TARGET DECK: ${selectedText.substring(13)}`
// })

fileContents = fileContents.replace(/FILE TAGS:.*/g, (selectedText) => {
  selectedText = selectedText.replaceAll(" ", "::")
  return `FILE TAGS: ${selectedText.substring(13)}`
})

// fileContents = removeMarkdownIndentation(fileContents);

const divider45 = "=============================================  "
const divider20 = "===================="

fileContents = fileContents.replace(/={45} *\n*(#{5} )*\s*/g, '')
// fs.writeFileSync(
//     "./filecontent.md",
//     fileContents
// )
fileContents = fileContents.replace(/#{6} ID\d*\s*/g, '')

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

// fs.writeFileSync(
//   './bad-questions.md',
//   `# Bad questions\n${invalidQuestions
//     .toString()
//     .replace(chapterTitleRegex, '')}`
// );


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
    // if (questionsAdded > 1) {
    //   break;
    // }
    const questionAndAnswer = question.split('A:: ');
    let answerText = `A: ${questionAndAnswer.pop().trim()}`;
    let questionText = `Q: ${questionAndAnswer.pop().substring(3).trim()}`;

    questionText = questionText.replace(/#{6} ID\d*\s*/g, '')
    const forFilename = questionText.replace(/={45} {2}\n\s*/g,"")
    // questionText = questionText.replace(/={45} {2}\n\s*##/g,"  \n")
    questionText = questionText.replace(/Q: ={45} {2}\n\s*##/g,"# Q: REPLACE ME\n")
    // answerText = answerText.replace(/={45} {2}\n\s*/g,"  \n")
    answerText = answerText.replace(/A: ={45} {2}\n\s*/g,"# A: REPLACE ME\n")

    // questionText = questionText.trim();
    questionText = questionText.replace(doubleSpaceRegex, ``);
    // questionText = questionText.replace(endOfLineRegex, `  `);
    questionText = questionText.replace(endOfLineRegex, `\n`);
    questionText = questionText.trim();

    const selectCodeBlock = /(```[\s\S]*?```)/g
    const codeblocks = answerText.match(selectCodeBlock)
    const codeblocksDict = {}

    for (let i = 0; i < codeblocks?.length; i++) {
      codeblocksDict[i] = codeblocks[i]
      answerText = answerText.replace(codeblocks[i], `G${i}G`)
    }

    const everythingExceptTablesBlockquotes = /^(?!(^\s*>\s.+|^\s*\|.*\|$)).+/gm
    answerText = answerText.replace(everythingExceptTablesBlockquotes, (selectedText) => {
      // if (questionsAdded === 1) {
      selectedText = selectedText.replace(doubleSpaceRegex, ``);
      // answerText = answerText.replace(endOfLineRegex, `  `);
      selectedText = selectedText.replace(endOfLineRegex, `\n`);
      // answerText = answerText.replace(lastWordRegex, match => `${match}  `);
      // }
      return selectedText
    })

    for (let numKey in codeblocksDict) {
      answerText = answerText.replace(`G${numKey}G`, codeblocksDict[numKey])
    }

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



    // console.log(answerText)

    answerText = answerText.trim();

    qandAResolved += `${questionText}\n${answerText}\n\n`;
    //if (questionsAdded === 63) {
    //console.log(typeof questionText);
    //console.log(typeof answerText);
    //console.log(questionText);
    //console.log(answerText);
    //}/


    let fileName = forFilename
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

    createQuestionFile(filePath, questionText, answerText, fullDeckInfo, newFileName);
  }
}

//console.log(questionsCreated);
// checkCreation(questionsCreated);
fileContents = fileContents.replace(/## Questions([\s\S]*?)### Part/, `## Questions\n${indexTable}\n### Part`)
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
  let count = 1
  text = text.replace(questionRegex, (selectedText) => {
    const question = selectedText.match(questionRegex)[0];
    const questionAndAnswer = question.split('A:: ');

    let questionText = questionAndAnswer[0];
    // if (count === 1) {
    //   console.log(questionText)
    // }

    let doubleSpaceRegexCustom = /( *)$/gm;

    questionText = questionText.trim();
    questionText = questionText.replace(doubleSpaceRegexCustom, ``);
    //
    // let includeQuestionMark = "?"
    let includeQuestionMark = ""
    const questionTextLastChar = questionText[questionText.length-1]
    if (questionTextLastChar === "?") {
      includeQuestionMark = ""
    }
    questionText.trim()
    questionText += `${includeQuestionMark}\n`
    questionText = questionText.replace(/(.+)$/gm, "$1  ");

    // questionText = questionText.replace(lastWordRegex, match => `${match}  `);

    let answerText = questionAndAnswer[1];
      // if (count === 1) {
      //   console.log(answerText)
      // }

    // if (count === 1) {
    //   console.log('=====================================')
    //   console.log(answerText)
    //   console.log('=====================================')
    //   count++
    // }

    answerText = answerText.replace(doubleSpaceRegex, ``);
    answerText = answerText.replace(endOfLineRegex, `  `);
    // answerText = answerText.replace(lastWordRegex, match => `${match}  `);

    const isTable = tableRegex.exec(answerText)
    if (isTable) {
       answerText = answerText.replace(tableRegex, '\n\n$1');
    }

    // answerText = answerText.replace(/A::( -*-)*/g, 'A:: -*-\n')

    answerText = answerText.trim();


    // console.log(test)

    // if (count === 9) {
    //  console.log(`${questionText}\nA:: ${answerText}`)
    //}

    //count++
    // if (count === 1) {
    //   console.log(questionText)
    //   ++count
    // }

    questionText = questionText.substring(4)
    const id = `###### ID${count++}`
    const returned = `Q:: ${divider45}\n\n##### ${questionText}\n${id}\n\nA:: ${divider45}\n${answerText}`
    // console.log(divider45)
    // console.log(returned)

    return returned;
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

function removeMarkdownIndentation(markdownText) {
  // Regular expression to match code blocks in Markdown
  let codeBlockRegex = /```[\s\S]+?```/g;

  // Extract code blocks from the Markdown text
  let codeBlocks = markdownText.match(codeBlockRegex) || [];

  // Replace indentation for non-code block lines
  let lines = markdownText.split('\n').map(function(line) {
    // Ignore lines that are part of code blocks
    if (codeBlocks.some(function(codeBlock) {
      return codeBlock.includes(line.trim());
    })) {
      line = line.replace(codeBlockStart, (matchText) => {
        return `${matchText.trim()}`
      })

      line = line.replace(codeBlockEnd, (matchText) => {
        return `${matchText.trim()}`
      })

      return line; // Return unchanged line for code blocks
    }
    // Remove indentation for non-code block lines
    return line.replace(/^\s*/, ''); // Assuming multiples whitespaces indentation
  });

  // Join lines and return the modified Markdown text
  return lines.join('\n');
}

function romanToNumber(roman) {
  const romanNumerals = {
    'I': 1,
    'V': 5,
    'X': 10,
    'L': 50,
    'C': 100,
    'D': 500,
    'M': 1000
  };

  let result = 0;
  let prevValue = 0;

  for (let i = roman.length - 1; i >= 0; i--) {
    let currentValue = romanNumerals[roman[i]];

    if (currentValue < prevValue) {
      result -= currentValue;
    } else {
      result += currentValue;
    }
    prevValue = currentValue;
  }

  return result;
}