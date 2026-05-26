const { exec } = require('child_process');
const path = require('path');

async function runSequential() {
  const evaluationFiles = [
    'evals/file-tools.eval.ts',
    'evals/shell-tools.eval.ts', 
    'evals/agent-multiturn.eval.ts'
  ];

  for (const evalFile of evaluationFiles) {
    console.log(`\n🚀 Running ${evalFile}...`);
    console.log('=' .repeat(50));
    
    try {
      await new Promise((resolve, reject) => {
        const process = exec(`npx lmnr eval ${evalFile}`, {
          cwd: path.resolve(__dirname)
        });
        
        process.stdout.on('data', (data) => {
          console.log(data.toString());
        });
        
        process.stderr.on('data', (data) => {
          console.error(data.toString());
        });
        
        process.on('close', (code) => {
          if (code === 0) {
            console.log(`✅ ${evalFile} completed successfully`);
            resolve();
          } else {
            console.log(`❌ ${evalFile} failed with code ${code}`);
            reject(new Error(`Process failed with code ${code}`));
          }
        });
      });
      
      // Wait 10 seconds between evaluations
      console.log('⏳ Waiting 10 seconds before next evaluation...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      
    } catch (error) {
      console.error(`❌ Failed to run ${evalFile}:`, error.message);
    }
  }
  
  console.log('\n🎉 All evaluations completed!');
}

runSequential().catch(console.error);
