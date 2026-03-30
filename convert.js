const fs = require('fs');
const { JSDOM } = require('jsdom');

const htmlContent = fs.readFileSync('sortifi-complete (1) (1).html', 'utf-8');

const dom = new JSDOM(htmlContent);
const document = dom.window.document;

// 1. Extract CSS
const styles = document.querySelectorAll('style');
let cssContent = '';
styles.forEach(s => cssContent += s.textContent + '\n');
fs.writeFileSync('src/pages/SortifiLandingPage.css', cssContent);

// 2. Extract JS
const scripts = document.querySelectorAll('script');
let jsContent = '';
scripts.forEach(s => {
  if (s.textContent && !s.src) {
    jsContent += s.textContent + '\n';
  }
});

// 3. Process HTML to JSX
const bodyNodes = Array.from(document.body.childNodes).filter(node => 
  node.nodeType === 1 && node.tagName !== 'SCRIPT'
);

function camelCase(str) {
  return str.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });
}

function parseStyle(cssText) {
  if (!cssText) return '{}';
  const styles = cssText.split(';').filter(s => s.trim() !== '');
  let objStr = '{';
  styles.forEach(s => {
    let [key, ...valParts] = s.split(':');
    let val = valParts.join(':').trim();
    if (key && val) {
      key = key.trim();
      let jsKey = camelCase(key);
      objStr += `${jsKey}: '${val.replace(/'/g, "\\'")}', `;
    }
  });
  objStr += '}';
  return objStr;
}

function nodeToJsx(node) {
  if (node.nodeType === 3) {
    let text = node.textContent;
    // escape '{' and '}'
    text = text.replace(/\{/g, '{"{"}').replace(/\}/g, '{"}"}');
    return text;
  }
  if (node.nodeType === 8) {
    return `{/* ${node.textContent} */}`;
  }
  if (node.nodeType !== 1) return '';

  let tagName = node.tagName.toLowerCase();
  let attrs = '';

  Array.from(node.attributes).forEach(attr => {
    let name = attr.name;
    let value = attr.value;
    
    if (name === 'class') name = 'className';
    else if (name === 'for') name = 'htmlFor';
    else if (name === 'readonly') name = 'readOnly';
    else if (name === 'autocomplete') name = 'autoComplete';
    else if (name === 'tabindex') name = 'tabIndex';
    else if (name === 'stroke-dasharray') name = 'strokeDasharray';
    else if (name === 'stroke-dashoffset') name = 'strokeDashoffset';
    else if (name === 'stroke-width') name = 'strokeWidth';
    else if (name === 'stroke-linecap') name = 'strokeLinecap';
    
    if (name === 'style') {
      attrs += ` style={${parseStyle(value)}}`;
    } else if (name === 'readonly' || name === 'readOnly') {
      attrs += ` readOnly`;
    } else {
      // Escape generic attributes
      attrs += ` ${name}="\${value.replace(/"/g, '&quot;')}"`;
    }
  });
  
  // self-closing tags
  const selfClosing = ['img', 'br', 'hr', 'input', 'meta', 'link', 'path'];
  if (selfClosing.includes(tagName)) {
    return `<${tagName}${attrs} />`;
  }

  let children = '';
  Array.from(node.childNodes).forEach(child => {
    children += nodeToJsx(child);
  });

  return `<${tagName}${attrs}>${children}</${tagName}>`;
}

let jsxHtml = '';
bodyNodes.forEach(node => {
  jsxHtml += nodeToJsx(node) + '\n';
});

// Since the JS heavily manipulates the DOM, we'll wrap it in a useEffect.
// We also need to import gsap and ScrollTrigger.
let tsxContent = `
import React, { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './SortifiLandingPage.css';

gsap.registerPlugin(ScrollTrigger);

export default function SortifiLandingPage() {
  useEffect(() => {
    // We wrap all the vanilla JS animation logic in a context
    let ctx = gsap.context(() => {
      ${jsContent}
    });
    
    return () => ctx.revert(); // cleanup
  }, []);

  return (
    <div className="sortifi-landing-page">
      ${jsxHtml}
    </div>
  );
}
`;

fs.writeFileSync('src/pages/SortifiLandingPage.tsx', tsxContent);
console.log('Successfully generated src/pages/SortifiLandingPage.tsx and src/pages/SortifiLandingPage.css');
