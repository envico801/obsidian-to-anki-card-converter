# Obsidian to anki card converter

**IMPORTANT**: For now it works on linux systems, this is due to regular expressions, in other operating systems it works differently, for example, In Windows, lines in text files are terminated with a carriage return (CR, `\r`) followed by a line feed (LF, `\n`) character ("\r\n"). In the near future I am planning an improved version that does not have these problems.

**Warning**: it's all broken, it barely works and when it works it breaks something else haha, it's a script I made in 10 minutes so I wouldn't have to pass all the cards by hand and avoid complications, **worried about Big O? Pfff... keep your fingers crossed that your computer doesn't hang up**.

![Whomst_Has_Awakened_The_Anicent_One_Meme](https://github.com/envico801/obsidian-to-anki-card-converter/assets/132226893/2e6aa442-03d4-4b55-ba2c-06b36b208f95)

It works in conjunction with [Obsidian](https://obsidian.md/) and the plugin to convert markdown files to flashcards, aka [Pseudonium/Obsidian_to_Anki](https://github.com/Pseudonium/Obsidian_to_Anki)

## How to run it

You should have a file similar to mine, for example this one [README.md](https://github.com/envico801/Master-the-Coding-Interview-Data-Structures-Algorithms/blob/main/anki/README.md)

`node ./script.js <file-name>.md`

e.g.

`node ./script.js Master-the-Coding-Interview-Data-Structures-Algorithms/anki/README.md`

`nodemon -x "clear;node --inspect" ./script.js Master-the-Coding-Interview-Data-Structures-Algorithms/anki/README.md`
