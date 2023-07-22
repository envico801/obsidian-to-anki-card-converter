// Read the text file path from command line arguments
const args = process.argv.slice(2);
const filePath = args[0];

// Read the file contents
const fileContents = fs.readFileSync(filePath, 'utf8');
