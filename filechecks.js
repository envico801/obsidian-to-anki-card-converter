const fs = require('fs');
const path = require('path');

const filePathsRaw = fs.readFileSync('./filePaths.txt', 'utf8');
const filePathJson = JSON.parse(filePathsRaw);
console.log(filePathJson.length);

function checkCreation(questionsArray) {
  let resultOfResults = `\n`;
  //console.log(questionsArray.length);
  const questionRegex =
    /^Q: ((?:.+\n)*)\n*A: (.+(?:\n(?:^.{1,3}$|^.{4}(?<!<!--).*))*)/gm;
  for (repath of questionsArray) {
    fs.readFile(repath, 'utf8', (err, data) => {
      //console.log(err);
      //resultOfResults += `==============================\n`;
      //console.log(data);
      data = data.match(questionRegex).join('\n');
      resultOfResults += `${data}\n\n`;
      fs.writeFileSync('qanda.md', resultOfResults);
    });
    //const result = fs.readFileSync(repath, 'utf8');
  }
  //fs.writeFileSync('./filePaths.txt', JSON.stringify(questionsArray));
}

checkCreation(filePathJson);
