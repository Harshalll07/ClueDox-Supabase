import fs from 'fs';
import { JSDOM } from 'jsdom';

const htmlContent = fs.readFileSync('sortifi-complete (1) (1).html', 'utf-8');

const dom = new JSDOM(htmlContent);
const document = dom.window.document;

// 1. Extract CSS
const styles = document.querySelectorAll('style');
let cssContent = '';
styles.forEach(s => cssContent += s.textContent + '\n');

// 2. Extract JS
const scripts = document.querySelectorAll('script');
let jsContent = '';
scripts.forEach(s => {
  if (s.textContent && !s.src) {
    jsContent += s.textContent + '\n';
  }
});

// Remove some unneeded scripts from extracted JS
jsContent = jsContent.replace(/gsap\.registerPlugin\(ScrollTrigger\);/g, '');

// 3. Process HTML to JSX
const bodyNodes = Array.from(document.body.childNodes).filter(node => 
  node.nodeType === 1 && node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE' && node.id !== 'particles-canvas'
);

// We need to add the particles canvas manually later using a ref if necessary, 
// wait, particles canvas is just a canvas in the body. Let's keep it.
const bodyNodesIncludingCanvas = Array.from(document.body.childNodes).filter(node => 
  node.nodeType === 1 && node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE'
);

function camelCase(str) {
  return str.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });
}

function parseStyle(cssText) {
  if (!cssText) return '{}';
  const styles = cssText.split(';').filter(s => s.trim() !== '');
  let objStr = '{';
  styles.forEach(s => {
    let parts = s.split(':');
    if(parts.length < 2) return;
    let key = parts[0].trim();
    let val = parts.slice(1).join(':').trim();
    if (key && val) {
      if(key.startsWith('-webkit-')) {
          key = key.replace('-webkit-', 'Webkit');
      }
      let jsKey = camelCase(key);
      objStr += `${jsKey}: '${val.replace(/'/g, "\\'")}', `;
    }
  });
  objStr += '}';
  return objStr;
}

const reactAttrMap = {
  'class': 'className',
  'for': 'htmlFor',
  'readonly': 'readOnly',
  'autocomplete': 'autoComplete',
  'tabindex': 'tabIndex',
  'stroke-dasharray': 'strokeDasharray',
  'stroke-dashoffset': 'strokeDashoffset',
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'clip-path': 'clipPath',
  'fill-rule': 'fillRule',
  'clip-rule': 'clipRule',
  'viewbox': 'viewBox',
  'preserveaspectratio': 'preserveAspectRatio',
  'stroke-linejoin': 'strokeLinejoin'
};

function nodeToJsx(node) {
  if (node.nodeType === 3) {
    let text = node.textContent;
    text = text.replace(/\{/g, '{"{"}').replace(/\}/g, '{"}"}');
    return text;
  }
  if (node.nodeType === 8) {
    return `{/* ${node.textContent.replace(/\*\//g, '* /')} */}`;
  }
  if (node.nodeType !== 1) return '';

  let tagName = node.tagName.toLowerCase();
  let attrs = '';

  Array.from(node.attributes).forEach(attr => {
    let name = attr.name.toLowerCase();
    let value = attr.value;
    
    if (Array.from(Object.keys(reactAttrMap)).includes(name)) {
      name = reactAttrMap[name];
    }
    
    if (name === 'style') {
      attrs += ` style={${parseStyle(value)}}`;
    } else if (name === 'readOnly' || name === 'disabled' || name === 'checked' || name === 'defer') {
      attrs += ` ${name}`;
    } else {
      attrs += ` ${name}="${value.replace(/"/g, '&quot;')}"`;
    }
  });
  
  const selfClosing = ['img', 'br', 'hr', 'input', 'meta', 'link', 'path', 'source'];
  if (selfClosing.includes(tagName)) {
    return `<${tagName}${attrs} />`;
  }

  // Handle special case where SVG paths with svg filters need react mapping
  if(tagName === 'svg') {
      // SVG tag mapping fix
  }

  let children = '';
  Array.from(node.childNodes).forEach(child => {
    children += nodeToJsx(child);
  });

  return `<${tagName}${attrs}>${children}</${tagName}>`;
}

let jsxHtml = '';
bodyNodesIncludingCanvas.forEach(node => {
  jsxHtml += nodeToJsx(node) + '\n';
});

// One more fix for SVG nested tag cases
jsxHtml = jsxHtml.replace(/<fegaussianblur/g, '<feGaussianBlur')
                 .replace(/<\/fegaussianblur>/g, '</feGaussianBlur>')
                 .replace(/stddeviation=/g, 'stdDeviation=')
                 .replace(/<femerge/g, '<feMerge')
                 .replace(/<\/femerge>/g, '</feMerge>')
                 .replace(/<femergenode/g, '<feMergeNode')
                 .replace(/<\/femergenode>/g, '</feMergeNode>')
                 .replace(/<defs>/g, '<defs>')
                 .replace(/<\/defs>/g, '</defs>');

let tsxContent = `
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './SortifiLandingPage.css';

gsap.registerPlugin(ScrollTrigger);

export default function SortifiLandingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    let ctx = gsap.context(() => {
      ${jsContent}
    });
    return () => ctx.revert();
  }, []);

  return (
    <div className="sortifi-landing-page">
      ${jsxHtml}
    </div>
  );
}
`;

fs.writeFileSync('src/pages/SortifiLandingPage.css', cssContent);
fs.writeFileSync('src/pages/SortifiLandingPage.tsx', tsxContent);
console.log('SUCCESS');
