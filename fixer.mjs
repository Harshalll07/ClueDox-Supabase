import fs from 'fs';
let css = fs.readFileSync('src/pages/SortifiLandingPage.css', 'utf8');

css = css.replace(/(\.sortifi-landing-page\s+[a-z1-6]+)\s*?\n(?=\s+([a-z\-]+:|@|\}))/g, '$1 {\n');
css = css.replace(/(\.sortifi-landing-page\s+html(?:\s*\n)?)/g, '$1 {\n');
css = css.replace(/(\.sortifi-landing-page\s+body(?:\s*\n)?)/g, '.sortifi-landing-page {\n'); 

fs.writeFileSync('src/pages/SortifiLandingPage.css', css, 'utf8');
console.log('Fixed missing braces in CSS successfully.');
