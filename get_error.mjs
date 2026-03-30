import fs from 'fs';
import { exec } from 'child_process';
exec('npm run build', (err, stdout, stderr) => {
   fs.writeFileSync('vite-err.txt', stdout + '\n' + stderr, 'utf-8');
   console.log('done');
});
