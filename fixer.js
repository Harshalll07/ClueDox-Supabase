const fs = require('fs');
let css = fs.readFileSync('src/pages/SortifiLandingPage.css', 'utf8');

// The issue was that `.sortifi-landing-page nav` is missing a `{`.
// We can find any `.sortifi-landing-page [a-z]+` that is immediately followed by a newline and a CSS property.
// Example:
// .sortifi-landing-page nav
//   position: fixed;
// Should become:
// .sortifi-landing-page nav {
//   position: fixed;

css = css.replace(/(\.sortifi-landing-page\s+[a-z1-6]+)\s*?\n(?=\s+[a-z\-]+:|\s*})/g, '$1 {\n');

// Also for html and body:
// .sortifi-landing-page html
//   scroll-behavior: auto;
// }
//
// .sortifi-landing-page body
//   font-family: var(--sans);
css = css.replace(/(\.sortifi-landing-page\s+html)\s*?\n/g, '$1 {\n');
css = css.replace(/(\.sortifi-landing-page\s+body)\s*?\n/g, '.sortifi-landing-page {\n'); // Convert body to wrapper class

fs.writeFileSync('src/pages/SortifiLandingPage.css', css, 'utf8');
console.log('Fixed missing braces in CSS.');
