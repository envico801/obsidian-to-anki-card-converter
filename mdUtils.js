import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype'
import rehypeHighlight from 'rehype-highlight';
import rehypeFormat from 'rehype-format'
import rehypeStringify from 'rehype-stringify';

export function convertMarkdownCodeblockToHtml (markdownText, indentation = null) {

    const processor = unified()
        .use(remarkParse) // Parse Markdown
        .use(remarkRehype) // Convert Markdown to HTML
        .use(rehypeHighlight) // Highlight code blocks
        .use(rehypeFormat) // Formats HTML
        .use(rehypeStringify) // Convert HTML back to string

    const htmlContent = processor.processSync(markdownText)
    let htmlContentStr = String(htmlContent)
    // console.log(htmlContentStr)
    if (indentation) {
        htmlContentStr = replaceTextWithIndentation(htmlContentStr, indentation)
    }

    // Replaces between lines
    const codeTagRegex = /<pre>.*<code[^>]*>\n/g
    const codeTagRegex2 = /\n *<\/code>.*<\/pre>/g
    htmlContentStr = htmlContentStr.replace(codeTagRegex, (match) => match.trim())
    htmlContentStr = htmlContentStr.replace(codeTagRegex2, (match) => match.trim())

    return htmlContentStr
}

export function replaceTextWithIndentation(originalText, indentation) {
    // Split the original text into lines
    const lines = originalText.split('\n');

    // Replace the text and maintain indentation
    const replacedLines = lines.map(line => {
        return line.replace(line, indentation + line);
    });

    // Join the lines back into a single string
    let replacedText = replacedLines.join('\n');

    const codeTagRegex = /(<pre>.*<code[^>]*>)/g
    const firstSpanWithIndentationRegex = /( {2,})(?=<span[^>]*>)/

    const spanIndentation = replacedText.match(firstSpanWithIndentationRegex)

    if (spanIndentation) {
        replacedText = replacedText.replace(codeTagRegex, `$1\n`)
    }

    return replacedText
}