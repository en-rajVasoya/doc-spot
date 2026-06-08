const fs = require('fs');
const path = require('path');

function parseCSS(cssText) {
    let index = 0;
    const length = cssText.length;

    function parseBlock() {
        const nodes = [];
        let currentText = '';

        while (index < length) {
            const char = cssText[index];

            // Handle comments
            if (char === '/' && cssText[index + 1] === '*') {
                if (currentText.trim()) {
                    nodes.push({ type: 'text', value: currentText });
                    currentText = '';
                }
                let start = index;
                index += 2;
                while (index < length && !(cssText[index] === '*' && cssText[index + 1] === '/')) {
                    index++;
                }
                if (index < length) {
                    index += 2; // consume '*/'
                }
                nodes.push({ type: 'comment', value: cssText.slice(start, index) });
                continue;
            }

            // Handle strings
            if (char === '"' || char === "'") {
                let start = index;
                const quote = char;
                index++;
                while (index < length && cssText[index] !== quote) {
                    if (cssText[index] === '\\') {
                        index++; // Skip escaped quote
                    }
                    index++;
                }
                if (index < length) {
                    index++; // Consume closing quote
                }
                currentText += cssText.slice(start, index);
                continue;
            }

            // Handle braces
            if (char === '{') {
                const selector = currentText;
                currentText = '';
                index++;
                const children = parseBlock();
                nodes.push({ type: 'block', selector, children });
                continue;
            }

            if (char === '}') {
                if (currentText.trim()) {
                    nodes.push({ type: 'text', value: currentText });
                    currentText = '';
                }
                index++;
                return nodes;
            }

            // Normal character
            currentText += char;
            index++;
        }

        if (currentText.trim()) {
            nodes.push({ type: 'text', value: currentText });
        }
        return nodes;
    }

    return parseBlock();
}

function collapseChildren(children) {
    const parts = [];
    for (const child of children) {
        if (child.type === 'text') {
            const lines = child.value.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);
            if (lines.length > 0) {
                parts.push(lines.join(' '));
            }
        } else if (child.type === 'comment') {
            parts.push(child.value.trim());
        }
    }
    return parts.join(' ');
}

function stringify(nodes, depth = 0) {
    let result = '';
    const indent = '    '.repeat(depth);
    
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (node.type === 'comment') {
            if (depth === 0 && i > 0) {
                result += '\n';
            }
            const lines = node.value.split('\n');
            for (const line of lines) {
                result += indent + line.trim() + '\n';
            }
        } else if (node.type === 'text') {
            const lines = node.value.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);
            for (const line of lines) {
                result += indent + line + '\n';
            }
        } else if (node.type === 'block') {
            if (depth === 0 && i > 0) {
                result += '\n';
            }
            const hasNested = node.children.some(child => child.type === 'block');
            const selector = node.selector.trim();
            if (hasNested) {
                result += indent + selector + ' {\n';
                result += stringify(node.children, depth + 1);
                result += indent + '}\n';
            } else {
                const inner = collapseChildren(node.children);
                result += indent + selector + ' { ' + inner + ' }\n';
            }
        }
    }
    return result;
}

const inputPath = path.join(__dirname, 'frontend', 'src', 'main.css');
if (!fs.existsSync(inputPath)) {
    console.error('File not found:', inputPath);
    process.exit(1);
}

const cssText = fs.readFileSync(inputPath, 'utf8');
console.log('Original length:', cssText.length);

const parsed = parseCSS(cssText);
const formatted = stringify(parsed);

console.log('Formatted length:', formatted.length);
console.log('\n--- SAMPLE OUTPUT (first 1000 characters) ---');
console.log(formatted.slice(0, 1000));
console.log('---------------------------------------------\n');
