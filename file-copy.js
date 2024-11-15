// flatCopySourceFiles.js
const fs = require('fs');
const path = require('path');

const backupFolder =
  'src_backup_' + new Date().toISOString().replace(/[:.]/g, '-');

// Create backup directory if it doesn't exist
if (!fs.existsSync(backupFolder)) {
  fs.mkdirSync(backupFolder);
}

// Function to copy all files recursively to a flat directory
function copyFilesFlat(
  sourceDir,
  destinationDir,
  originalBasePath = sourceDir,
) {
  const files = fs.readdirSync(sourceDir);

  files.forEach((file) => {
    const sourcePath = path.join(sourceDir, file);

    if (fs.statSync(sourcePath).isDirectory()) {
      // If it's a directory, recursively scan it
      copyFilesFlat(sourcePath, destinationDir, originalBasePath);
    } else {
      // Generate a unique filename by including the relative path in the filename
      const relativePath = path.relative(originalBasePath, sourceDir);
      const uniqueFilename = relativePath
        ? `${relativePath.replace(/[\\/]/g, '_')}_${file}`
        : file;

      const destinationPath = path.join(destinationDir, uniqueFilename);

      // Copy the file
      fs.copyFileSync(sourcePath, destinationPath);
      console.log(`Copied: ${sourcePath} -> ${destinationPath}`);
    }
  });
}

// Start copying from src directory
try {
  copyFilesFlat('src', backupFolder);
  console.log(
    `\nBackup completed successfully! Files copied to: ${backupFolder}`,
  );
} catch (error) {
  console.error('Error occurred while copying files:', error);
}
